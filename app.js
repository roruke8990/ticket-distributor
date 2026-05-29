// 신규 작품 추가 및 균등 순차 분배 처리
function addArtwork() {
    // 동기화 안정성 확보를 위해 최신 설정 갱신
    if (typeof saveConfigFromUI === 'function') {
        saveConfigFromUI();
    }

    const titleInput = document.getElementById('title');
    const title = titleInput.value.trim();
    const start = parseInt(document.getElementById('payStart').value);
    const end = parseInt(document.getElementById('payEnd').value);
    const tickets = parseInt(document.getElementById('tickets').value);

    if (!title) { alert('작품명을 입력해주세요.'); return; }
    if (start > end) { alert('시작 화수가 종료 화수보다 클 수 없습니다.'); return; }

    // 작업해야 할 총 화수 계산
    const totalNeeded = end - start + 1;

    // 설정된 전체 계정 목록 수집 (메인 + 서브 그룹 모두 통합)
    let allConfiguredAccounts = [];
    sysConfig.groups.forEach(group => {
        for (let i = group.start; i <= group.end; i++) {
            allConfiguredAccounts.push(i);
        }
    });

    // 중복 제거 및 오름차순 정렬 (계정 번호 순)
    allConfiguredAccounts = [...new Set(allConfiguredAccounts)].sort((a, b) => a - b);

    // [전체 이용권 보유량 계산] 전체 계정 수 * 계정당 이용권 수
    const totalCapacity = allConfiguredAccounts.length * tickets;

    // 분배할 회차 리스트 생성 결정
    let episodes = [];
    
    if (totalCapacity >= totalNeeded) {
        // [조건 1] 이용권이 충분하여 전 회차 분배가 가능한 경우 -> 오름차순 분배
        for (let i = start; i <= end; i++) {
            episodes.push(i);
        }
    } else {
        // [조건 2] 이용권이 부족하여 전체 분배가 불가능한 경우 -> 역순(내림차순) 우선 분배
        for (let i = end; i >= start; i--) {
            episodes.push(i);
        }
    }

    // 빈 계정 맵 초기화
    let accountMap = {};
    allConfiguredAccounts.forEach(acc => {
        accountMap[acc] = [];
    });

    // 순차적 분배 알고리즘 (1번 계정부터 순서대로 티켓 수만큼 채우기)
    let epIdx = 0;
    for (let acc of allConfiguredAccounts) {
        for (let t = 0; t < tickets; t++) {
            if (epIdx < totalNeeded) {
                accountMap[acc].push(episodes[epIdx]);
                epIdx++;
            } else {
                break;
            }
        }
    }

    // 데이터 바인딩 객체 생성
    let distribution = [];
    allConfiguredAccounts.forEach(acc => {
        let pcGroupName = '';
        let pcGroupClass = '';

        // 계정이 어떤 그룹 범위에 속하는지 동적 인덱스 기반 검사
        sysConfig.groups.forEach((group, idx) => {
            if (acc >= group.start && acc <= group.end) {
                pcGroupName = group.name;
                pcGroupClass = idx === 0 ? 'main-pc' : `sub-pc${idx}`;
            }
        });

        // 렌더링을 위해 각 계정에 들어간 회차 데이터를 보기 편하게 오름차순으로 항상 재정렬
        let sortedAccEps = accountMap[acc] ? [...accountMap[acc]].sort((a, b) => a - b) : [];

        distribution.push({
            account: acc,
            pcGroup: pcGroupName,
            pcClass: pcGroupClass,
            episodes: sortedAccEps,
            hasEpisodes: sortedAccEps.length > 0,
            isDone: false
        });
    });

    // 대시보드 표시용 안내 문구 설정
    const isShortage = totalCapacity < totalNeeded;
    const rangeText = `${start}화 ~ ${end}화 (계정당 ${tickets}장 분배 / ${isShortage ? '용량부족·역순우선' : '전체순차·오름차순'})`;

    const newArtwork = {
        id: Date.now(),
        title: title,
        range: rangeText,
        distribution: distribution
    };

    artworks.push(newArtwork);
    if (typeof saveToStorage === 'function') saveToStorage();
    renderDashboard();
    titleInput.value = '';
}

function deleteArtwork(id) {
    if (confirm("이 작품을 대시보드에서 삭제하시겠습니까?")) {
        artworks = artworks.filter(item => item.id !== id);
        if (typeof saveToStorage === 'function') saveToStorage();
        renderDashboard();
    }
}

function toggleAccountDone(artworkId, accountNo, isChecked) {
    const artwork = artworks.find(item => item.id === artworkId);
    if (artwork) {
        const dist = artwork.distribution.find(d => d.account === accountNo);
        if (dist) dist.isDone = isChecked;
    }
    if (typeof saveToStorage === 'function') saveToStorage();
    renderDashboard();
}

// 화면 렌더링 엔진
function renderDashboard() {
    const ongoingGrid = document.getElementById('ongoingGrid');
    const completedGrid = document.getElementById('completedGrid');
    
    if (!ongoingGrid || !completedGrid) return;

    ongoingGrid.innerHTML = '';
    completedGrid.innerHTML = '';

    let ongoingCount = 0;
    let completedCount = 0;

    artworks.forEach(art => {
        const assignedAccounts = art.distribution.filter(d => d.hasEpisodes);
        const isAllFinished = assignedAccounts.every(d => d.isDone === true);

        const card = document.createElement('div');
        card.className = 'artwork-card';
        
        let listHtml = '';
        art.distribution.forEach(d => {
            let itemClass = `account-item ${d.pcClass}`;
            let disabledAttr = '';
            let checkedAttr = '';
            let epsText = '';

            if (!d.hasEpisodes) {
                itemClass += ' unassigned';
                disabledAttr = 'disabled';
                epsText = '<span class="episode-badge none">-</span>';
            } else {
                if (d.isDone) {
                    itemClass += ' checked';
                    checkedAttr = 'checked';
                }
                epsText = `<span class="episode-badge">${d.episodes.map(e => e + '화').join(', ')}</span>`;
            }

            listHtml += `
                <div class="item-wrapper">
                    <div class="${itemClass}">
                        <input type="checkbox" ${checkedAttr} ${disabledAttr}
                               onchange="toggleAccountDone(${art.id}, ${d.account}, this.checked)">
                        <div class="acc-info">
                            <span><strong>${d.account}번 계정</strong> <small style="color:#64748b;">${d.pcGroup}</small></span>
                            ${epsText}
                        </div>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <button class="btn-delete" onclick="deleteArtwork(${art.id})">×</button>
            <div class="card-header">
                <h3 class="card-title">${art.title}</h3>
            </div>
            <div class="card-meta">설정: ${art.range}</div>
            <div class="account-list">
                ${listHtml}
            </div>
        `;

        if (isAllFinished && assignedAccounts.length > 0) {
            completedGrid.appendChild(card);
            completedCount++;
        } else {
            ongoingGrid.appendChild(card);
            ongoingCount++;
        }
    });

    document.getElementById('ongoingCount').innerText = `${ongoingCount}개`;
    document.getElementById('completedCount').innerText = `${completedCount}개`;

    if (ongoingCount === 0) {
        ongoingGrid.innerHTML = '<div class="empty-msg">현재 진행 중인 작품이 없습니다. 새로운 작품을 등록해 보세요!</div>';
    }
    if (completedCount === 0) {
        completedGrid.innerHTML = '<div class="empty-msg">완료된 작품이 없습니다. 모든 계정의 체크박스를 켜면 이곳으로 이동합니다.</div>';
    }
}