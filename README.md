# loresentry-frontend

Lore Sentry 웹 프론트엔드. Next.js 16 정적 export 로 빌드해 S3 + CloudFront 에 배포한다.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check:cdn    # CI 와 같은 전체 검사
```

- **기본값은 여전히 mock** 이다. 실패·지연은 `?mock=search.query:fail` 처럼 URL 로 넣는다.
- **`?data=api` 를 붙이면 실제 API(`api.loresentry.com`)를 쓴다.** 프로젝트·파일·문서·버전·검색이 서버에서 오고, 나머지 포트는 mock 이 채운다. 포트 단위 전환과 아직 안 되는 기능은 [frontend/api-adapter.md](https://github.com/soma-lorekeeper/docs/blob/main/frontend/api-adapter.md) 에 있다.
- 와이어프레임은 `docs/design/lorekeeper.pen`(화면)과 `lorekeeper.lib.pen`(컴포넌트·변수)이다. 디자인 토큰은 여기서 생성한다(`pnpm tokens`).
- 구조·서버 가정·와이어프레임 대응·남은 결정은 [soma-lorekeeper/docs 의 frontend/](https://github.com/soma-lorekeeper/docs/tree/main/frontend) 에 정리돼 있다.
