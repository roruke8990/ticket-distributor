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

    let episodes = [];
    for (let i = start; i <= end; i++) episodes.push(i);

    const totalNeeded = episodes.length;

    // 설정된 계정 그룹 범위 수집
    let mainAccounts = [];
    for(let i = sysConfig.main.start; i <= sysConfig.main.end; i++) mainAccounts.push(i);

    let groupA = [];
    for(let i = sysConfig.sub1.start; i <= sysConfig.sub1.end; i++) groupA.push(i);

    let groupB = [];
    for(let i = sysConfig.sub2.start; i <= sysConfig.sub2.end; i++) groupB.push(i);

    const subCapacity = (groupA.length + groupB.length) * tickets;

    // 통합 맵 구성을 위한 전체 계정 리스트업 정렬
    let allConfiguredAccounts = [...mainAccounts, ...groupA, ...groupB].sort((a,b) => a-b);
    let minAccountNum = Math.min(...allConfiguredAccounts);
    let maxAccountNum = Math.max(...allConfiguredAccounts);

    let accountMap = {};
    for (let i = minAccountNum; i <= maxAccountNum; i++) {
        accountMap[i] = [];
    }

    // 조건 분기 배정 알고리즘
    if (subCapacity >= totalNeeded) {
        let neededAccountsCount = Math.ceil(totalNeeded / tickets);
        let takeFromA = Math.ceil(neededAccountsCount / 2);
        let takeFromB = neededAccountsCount - takeFromA;

        if (takeFromA > groupA.length) {
            takeFromA = groupA.length;
            takeFromB = neededAccountsCount - takeFromA;
        } else if (takeFromB > groupB.length) {
            takeFromB = groupB.length;
            takeFromA = neededAccountsCount - takeFromB;
        }

        let activeSubAccounts = [];
        for (let i = 0; i < takeFromA; i++) if(groupA[i]) activeSubAccounts.push(groupA[i]);
        for (let i = 0; i < takeFromB; i++) if(groupB[i]) activeSubAccounts.push(groupB[i]);

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

        if (acc >= sysConfig.main.start && acc <= sysConfig.main.end) {
            pcGroupName = sysConfig.main.name;
            pcGroupClass = 'main-pc';
        } else if (acc >= sysConfig.sub1.start && acc <= sysConfig.sub1.end) {
            pcGroupName = sysConfig.sub1.name;
            pcGroupClass = 'sub-pc1';
        } else if (acc >= sysConfig.sub2.start && acc <= sysConfig.sub2.end) {
            pcGroupName = sysConfig.sub2.name;
            pcGroupClass = 'sub-pc2';
        }

        distribution.push({
            account: acc,
            pcGroup: pcGroupName,
            pcClass: pcGroupClass,
            episodes: accountMap[acc] || [],
            hasEpisodes: accountMap[acc] && accountMap[acc].length > 0,
            isDone: false
        });
    });

    const newArtwork = {
        id: Date.now(),
        title: title,
        range: `${start}화 ~ ${end}화 (계정당 ${tickets}장 분배)`,
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