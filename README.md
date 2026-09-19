# loresentry-frontend

Lore Sentry 웹 프론트엔드. Next.js 16 정적 export 로 빌드해 S3 + CloudFront 에 배포한다.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check:cdn    # CI 와 같은 전체 검사
```

- 백엔드 API 가 아직 없어 모든 데이터는 브라우저 안의 mock 서비스가 만든다. 실패·지연은 `?mock=search.query:fail` 처럼 URL 로 넣는다.
- 와이어프레임은 `docs/design/lorekeeper.pen`(화면)과 `lorekeeper.lib.pen`(컴포넌트·변수)이다. 디자인 토큰은 여기서 생성한다(`pnpm tokens`).
- 구조·서버 가정·와이어프레임 대응·남은 결정은 [soma-lorekeeper/docs 의 frontend/](https://github.com/soma-lorekeeper/docs/tree/main/frontend) 에 정리돼 있다.
