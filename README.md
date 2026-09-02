# Lorekeeper frontend

이 프로젝트는 Next.js 화면을 정적 파일로 export해 CDN에서 제공한다. 애플리케이션
데이터의 조회와 저장은 별도 백엔드가 담당하며, Next.js 서버는 배포하지 않는다.

## CDN 산출물

```bash
pnpm build:webpack
```

배포 대상은 생성된 `out/` 디렉터리 전체다. CDN은 디렉터리의 `index.html`을 제공할
수 있어야 하며, 작업공간 URL은 `/workspace?projectId=glass-garden` 형식을 사용한다.

백엔드 주소는 배포된 `out/config.json`의 `apiBaseUrl`에 절대 HTTP(S) URL로 설정한다.
빈 문자열은 백엔드가 아직 연결되지 않았다는 의미다. 이 파일만 교체하면 프론트
번들을 다시 빌드하지 않고 환경별 백엔드 주소를 바꿀 수 있다.

## 검증

```bash
pnpm check:cdn
```

포맷, 디자인 시스템, 테스트, lint, typecheck와 정적 build를 실행한 뒤 필수 산출물과
주요 URL의 정적 HTTP 응답을 검사한다.
