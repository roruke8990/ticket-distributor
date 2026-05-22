// 전역 변수 선언
let artworks = [];
let sysConfig = {
    main: { name: 'MainPC', start: 1, end: 3 },
    sub1: { name: 'SubPC1', start: 4, end: 6 },
    sub2: { name: 'SubPC2', start: 7, end: 8 }
};

// 페이지 로드 시 스토리지 데이터 불러오기 및 초기 세팅
window.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('webstory_dashboard_data');
    if (savedData) artworks = JSON.parse(savedData);

    const savedConfig = localStorage.getItem('webstory_sys_config');
    if (savedConfig) {
        sysConfig = JSON.parse(savedConfig);
        
        // UI 컴포넌트에 세팅값 로드
        document.getElementById('cfgMainName').value = sysConfig.main.name;
        document.getElementById('cfgMainStart').value = sysConfig.main.start;
        document.getElementById('cfgMainEnd').value = sysConfig.main.end;

        document.getElementById('cfgSub1Name').value = sysConfig.sub1.name;
        document.getElementById('cfgSub1Start').value = sysConfig.sub1.start;
        document.getElementById('cfgSub1End').value = sysConfig.sub1.end;

        document.getElementById('cfgSub2Name').value = sysConfig.sub2.name;
        document.getElementById('cfgSub2Start').value = sysConfig.sub2.start;
        document.getElementById('cfgSub2End').value = sysConfig.sub2.end;
    }

    // 초기 대시보드 렌더링 호출 (app.js 내부 함수)
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
});

// 접이식 패널 토글 제어
function toggleConfigPanel() {
    const panel = document.getElementById('configPanel');
    const arrow = document.getElementById('accordionArrow');
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
    sysConfig.main.name = document.getElementById('cfgMainName').value.trim() || 'MainPC';
    sysConfig.main.start = parseInt(document.getElementById('cfgMainStart').value) || 1;
    sysConfig.main.end = parseInt(document.getElementById('cfgMainEnd').value) || 3;

    sysConfig.sub1.name = document.getElementById('cfgSub1Name').value.trim() || 'SubPC1';
    sysConfig.sub1.start = parseInt(document.getElementById('cfgSub1Start').value) || 4;
    sysConfig.sub1.end = parseInt(document.getElementById('cfgSub1End').value) || 6;

    sysConfig.sub2.name = document.getElementById('cfgSub2Name').value.trim() || 'SubPC2';
    sysConfig.sub2.start = parseInt(document.getElementById('cfgSub2Start').value) || 7;
    sysConfig.sub2.end = parseInt(document.getElementById('cfgSub2End').value) || 8;

    localStorage.setItem('webstory_sys_config', JSON.stringify(sysConfig));
}

function saveToStorage() {
    localStorage.setItem('webstory_dashboard_data', JSON.stringify(artworks));
}