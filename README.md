# IdeaBank 오늘의 할일 체크리스트

비밀번호 게이트가 있는 단순한 오늘의 할일 체크리스트 웹앱입니다. 인증 후 할일 추가, 완료 토글, 삭제를 사용할 수 있고 데이터는 브라우저 로컬 스토리지에 저장됩니다.

## 실행

```bash
PORT=3344 ACCESS_PASSWORD=ideabank2026 node server.js
```

브라우저에서 `http://localhost:3344`로 접속합니다.

## 테스트

```bash
npm test
```

## Docker

```bash
PORT=3344 ACCESS_PASSWORD=ideabank2026 docker compose up --build
```

## 환경변수

- `PORT`: 서버 포트
- `ACCESS_PASSWORD`: 루트 경로 비밀번호. 기본값은 `ideabank2026`
