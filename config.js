// 전역 변수 선언
let artworks = [];
// 고정 형태에서 배열 형태로 구조 변경 (기본값 제공)
let sysConfig = {
    groups: [
        { name: 'MainPC', start: 1, end: 3, type: 'main' },
        { name: 'SubPC1', start: 4, end: 6, type: 'sub' },
        { name: 'SubPC2', start: 7, end: 8, type: 'sub' }
    ]
};

// 페이지 로드 시 스토리지 데이터 불러오기 및 초기 세팅
window.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('webstory_dashboard_data');
    if (savedData) artworks = JSON.parse(savedData);

    const savedConfig = localStorage.getItem('webstory_sys_config');
    if (savedConfig) {
        sysConfig = JSON.parse(savedConfig);
    }
    
    // 무조건 UI를 동적으로 생성하여 그려줌
    renderConfigUI();

    // 초기 대시보드 렌더링 호출 (app.js 내부 함수)
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
});

// 설정 UI 동적 렌더링 함수
function renderConfigUI() {
    const container = document.getElementById('configContainer');
    if (!container) return;
    container.innerHTML = '';

    sysConfig.groups.forEach((group, index) => {
        const card = document.createElement('div');
        card.className = 'config-card';
        
        // 첫 번째 그룹은 메인 고정, 그 외 서브 그룹들은 삭제 버튼 부여
        const deleteBtnHtml = index > 0 
            ? `<button type="button" class="btn-delete-group" onclick="removeConfigGroupUI(${index})">×</button>` 
            : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:2px solid #edf2f7; padding-bottom:4px;">
                <h4 style="margin:0; font-size:14px;">${index === 0 ? '🖥️' : '⚡'} ${index === 0 ? '메인' : '서브'} PC 그룹</h4>
                ${deleteBtnHtml}
            </div>
            <div class="config-row">
                <label>그룹명</label>
                <input type="text" class="cfg-name" data-index="${index}" value="${group.name}">
            </div>
            <div class="config-row">
                <label>계정범위</label>
                <input type="number" class="cfg-start" data-index="${index}" value="${group.start}" style="width:70px;">
                <span>~</span>
                <input type="number" class="cfg-end" data-index="${index}" value="${group.end}" style="width:70px;">
            </div>
        `;
        container.appendChild(card);
    });

    // 새로 생긴 input들에 이벤트 바인딩 처리 (값 변경 시 자동세이브)
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveConfigFromUI);
    });
}

// UI에서 새 그룹 추가 버튼 클릭 시
function addConfigGroupUI() {
    // 기존 데이터 세이브 후 새 데이터 Push
    saveConfigFromUI();
    
    // 마지막 그룹의 번호를 파악하여 이어지는 기본값 세팅
    const lastGroup = sysConfig.groups[sysConfig.groups.length - 1];
    const nextStart = lastGroup ? lastGroup.end + 1 : 1;
    const nextEnd = nextStart + 2;
    const nextIdx = sysConfig.groups.length;

    sysConfig.groups.push({
        name: `SubPC${nextIdx}`,
        start: nextStart,
        end: nextEnd,
        type: 'sub'
    });

    renderConfigUI();
    saveConfigFromUI();
}

// 특정 그룹 삭제 버튼 클릭 시
function removeConfigGroupUI(index) {
    if (confirm("이 PC 그룹을 삭제하시겠습니까? 관련 범위 계정 할당이 변경될 수 있습니다.")) {
        sysConfig.groups.splice(index, 0); // 선택 인덱스 삭제
        sysConfig.groups.splice(index, 1);
        renderConfigUI();
        saveConfigFromUI();
    }
}

// 접이식 패널 토글 제어
function toggleConfigPanel() {
    const panel = document.getElementById('configPanel');
    const arrow = document.getElementById('accordionArrow');
    if (!panel) return;
    
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        arrow.innerText = '▼';
        saveConfigFromUI();
    } else {
        panel.classList.add('open');
        arrow.innerText = '▲';
    }
}

// 입력 창의 최신 정보를 전역 객체 및 스토리지에 동기화
function saveConfigFromUI() {
    const container = document.getElementById('configContainer');
    if (!container) return;

    const names = container.querySelectorAll('.cfg-name');
    const starts = container.querySelectorAll('.cfg-start');
    const ends = container.querySelectorAll('.cfg-end');

    sysConfig.groups = [];

    names.forEach((el, index) => {
        const idx = parseInt(el.getAttribute('data-index'));
        sysConfig.groups[idx] = {
            name: el.value.trim() || (idx === 0 ? 'MainPC' : `SubPC${idx}`),
            start: parseInt(starts[index].value) || 1,
            end: parseInt(ends[index].value) || 1,
            type: idx === 0 ? 'main' : 'sub'
        };
    });

    localStorage.setItem('webstory_sys_config', JSON.stringify(sysConfig));
}

function saveToStorage() {
    localStorage.setItem('webstory_dashboard_data', JSON.stringify(artworks));
}