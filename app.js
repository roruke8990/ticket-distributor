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

    // [요구사항 1] 유료화수의 분배는 역순우선(내림차순)으로 진행합니다.
    // i를 end부터 start까지 거꾸로 담아 리스트 최상단에 유료회차가 강제 위치하게 만듭니다.
    let episodes = [];
    for (let i = end; i >= start; i--) {
        episodes.push(i);
    }

    const totalNeeded = episodes.length;

    // [요구사항 2] 동적 변환된 sysConfig.groups를 기반으로 계정 수집
    // 첫 번째 그룹은 메인 계정, 그 이후 그룹들은 모두 서브 그룹 계정으로 분리
    let mainAccounts = [];
    let allSubAccounts = []; // 모든 서브 계정을 순서대로 병합 보관할 배열
    let subGroupLists = [];  // 각 서브 그룹별 내부 계정 배열 리스트

    sysConfig.groups.forEach((group, idx) => {
        let currentGroupAccs = [];
        for(let i = group.start; i <= group.end; i++) {
            currentGroupAccs.push(i);
        }
        
        if (idx === 0) {
            mainAccounts = currentGroupAccs;
        } else {
            allSubAccounts = allSubAccounts.concat(currentGroupAccs);
            subGroupLists.push(currentGroupAccs);
        }
    });

    const subCapacity = allSubAccounts.length * tickets;

    // 통합 맵 구성을 위한 전체 계정 리스트업 정렬
    let allConfiguredAccounts = [...mainAccounts, ...allSubAccounts].sort((a, b) => a - b);
    let minAccountNum = Math.min(...allConfiguredAccounts);
    let maxAccountNum = Math.max(...allConfiguredAccounts);

    let accountMap = {};
    for (let i = minAccountNum; i <= maxAccountNum; i++) {
        accountMap[i] = [];
    }

    // 조건 분기 배정 알고리즘 (동적 서브 그룹 대응 균등 분배)
    if (subCapacity >= totalNeeded) {
        let neededAccountsCount = Math.ceil(totalNeeded / tickets);
        let activeSubAccounts = [];

        if (subGroupLists.length > 0) {
            // 여러 서브 그룹간에 계정을 한 개씩 라운드로빈 방식으로 균등하게 징집합니다.
            let maxLen = Math.max(...subGroupLists.map(g => g.length));
            for (let i = 0; i < maxLen; i++) {
                for (let g = 0; g < subGroupLists.length; g++) {
                    if (subGroupLists[g][i] && activeSubAccounts.length < neededAccountsCount) {
                        activeSubAccounts.push(subGroupLists[g][i]);
                    }
                }
            }
        }

        let epIdx = 0;
        for (let acc of activeSubAccounts) {
            for (let t = 0; t < tickets; t++) {
                if (epIdx < totalNeeded) {
                    accountMap[acc].push(episodes[epIdx]);
                    epIdx++;
                }
            }
        }
    } else {
        // 용량 부족 시 메인 포함 전체 PC에 순차적 분배
        let epIdx = 0;
        for (let acc of allConfiguredAccounts) {
            for (let t = 0; t < tickets; t++) {
                if (epIdx < totalNeeded) {
                    accountMap[acc].push(episodes[epIdx]);
                    epIdx++;
                }
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
                // 인덱스 기반으로 동적 클래스 부여 (main-pc, sub-pc1, sub-pc2, sub-pc3...)
                pcGroupClass = idx === 0 ? 'main-pc' : `sub-pc${idx}`;
            }
        });

        // 렌더링을 위해 각 계정에 들어간 회차 데이터를 보기 편하게 오름차순으로 재정렬
        let sortedAccEps = accountMap[acc] ? [...accountMap[acc]].sort((a,b) => a-b) : [];

        distribution.push({
            account: acc,
            pcGroup: pcGroupName,
            pcClass: pcGroupClass,
            episodes: sortedAccEps,
            hasEpisodes: sortedAccEps.length > 0,
            isDone: false
        });
    });

    const newArtwork = {
        id: Date.now(),
        title: title,
        range: `${start}화 ~ ${end}화 (계정당 ${tickets}장 분배 / 역순 우선)`,
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