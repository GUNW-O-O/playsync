# Playsync: 실시간 오프라인 홀덤 관리 SaaS 시스템
> 오프라인 홀덤은 딜러의 실수, 플레이어의 턴 실수, 칩 계산 착오 등 인적 오류(Human Error)가 빈번합니다.
> 이를 디지털로 풀어내어 실수를 줄이고 데이터정합성을 100% 보장하는 시스템을 구축하고자 했습니다.

<details>
  <summary><h3>진행 상황</h3></summary>
  3.15 MVP 개발완료
</details>

## 🛠 기술 스택
- **Backend**: NestJS
- **Frontend**: Next.js
- **Database**: Redis, Postgre
- **Auth**: JWT
- **ETC**: Docker
---
<details>
  <summary><h3>아키텍쳐</h3></summary>
  <img src="./img/architecture.png" width="600" />
</details>
<details>
  <summary><h3>플로우 차트</h3></summary>
  <img src="./img/mermaid.png" width="600" />
</details>

## 📌 주요 기능

### 토너먼트 관리

---

### 플레이어 / 딜러 화면

---

### 전광판


---

## 🚀 향후 확장
- 토너먼트의 과거 정보등 가맹점별 상세조회, 관리페이지
- 결제연동을 통한 대회에 참여할수 있는 포인트 추가기능
- 좌석 결정시 웹소켓을 통한 실시간 자리 선점정보
- 리바이 콜백(구현완료)을 웹소켓과 연결하여 리바인기능
- 사용자 친화적인 UI
- 플랫폼 어드민 기능

