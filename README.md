# Lorekeeper frontend

이 프로젝트는 Next.js 화면을 정적 파일로 export해 CDN에서 제공한다. 애플리케이션
데이터의 조회와 저장은 별도 백엔드가 담당하며, Next.js 서버는 배포하지 않는다.

## 로컬 실행

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`http://localhost:3000`에서 확인한다. Node 버전은 `.node-version`의 24를 사용한다.

배포본과 동일한 정적 산출물을 확인하려면 build 후 `out/`을 정적 서버로 제공한다.

```bash
pnpm build:webpack
python3 -m http.server 4321 --directory out
```

## CDN 산출물

```bash
pnpm build:webpack
```

배포 대상은 생성된 `out/` 디렉터리 전체다. CDN은 디렉터리의 `index.html`을 제공할
수 있어야 하며, 작업공간 URL은 `/workspace?projectId=glass-garden` 형식을 사용한다.

백엔드 주소는 배포된 `out/config.json`의 `apiBaseUrl`에 절대 HTTP(S) URL로 설정한다.
빈 문자열은 백엔드가 아직 연결되지 않았다는 의미다. 이 파일만 교체하면 프론트
번들을 다시 빌드하지 않고 환경별 백엔드 주소를 바꿀 수 있다.

저장소 기준값은 `public/config.json`이며 현재 prod 백엔드는 다음과 같다.

```json
{ "apiBaseUrl": "https://api.loresentry.com" }
```

이 주소는 Cloudflare에서 ALB로 연결되는 Gateway/BFF 진입점이다. 프론트가
`https://loresentry.com`에서 제공되므로 Gateway는 해당 origin에 대한 CORS를
허용해야 한다.

## 검증

```bash
pnpm check:cdn
```

포맷, 디자인 시스템, 테스트, lint, typecheck와 정적 build를 실행한 뒤 필수 산출물과
주요 URL의 정적 HTTP 응답을 검사한다.

## 배포

`main` push 시 `.github/workflows/ci-cd.yaml`이 `pnpm check:cdn`을 통과한
산출물을 S3에 올리고 CloudFront 캐시를 무효화한다. 이 저장소는 컨테이너 이미지를
만들지 않으므로 ECR / Lambda / Argo CD 흐름을 타지 않는다.

```text
main push
  -> GitHub Actions (pnpm check:cdn)
  -> S3 loresentry-web-prod-197179613039
  -> CloudFront invalidation
  -> https://loresentry.com
```

배포 대상 리소스:

| 항목                    | 값                                                                    |
| ----------------------- | --------------------------------------------------------------------- |
| AWS account             | `197179613039`                                                        |
| S3 bucket               | `loresentry-web-prod-197179613039` (ap-northeast-2, 퍼블릭 접근 차단) |
| CloudFront distribution | `E3L6QXQGVEJTYQ` / `dhi5kkvt5ncal.cloudfront.net`                     |
| CloudFront Function     | `loresentry-web-rewrite` (viewer-request)                             |
| ACM certificate         | `loresentry.com`, `*.loresentry.com` (us-east-1)                      |
| 서비스 도메인           | `https://loresentry.com` (`www`는 301 redirect)                       |

업로드는 세 단계로 나뉘며 순서가 중요하다.

1. `out/_next/`를 `max-age=31536000, immutable`로 먼저 올린다. 새 HTML이 참조할
   청크가 미리 존재해야 한다.
2. 나머지를 `max-age=60`으로 올리며 `--delete`로 오래된 산출물을 정리한다.
3. `config.json`은 `no-store`로 따로 올려 런타임 설정이 캐시되지 않게 한다.

S3는 정적 웹사이트 호스팅을 사용하지 않는다. CloudFront가 OAC로 서명해 REST
엔드포인트에 접근하므로 버킷은 비공개로 유지된다. REST 오리진은 디렉터리 index를
해석하지 않기 때문에 `next.config.ts`의 `trailingSlash: true`가 만드는
`out/login/index.html` 구조는 `loresentry-web-rewrite` 함수가 처리한다. 이 함수는
쿼리스트링에 의존하는 라우트를 위해 리다이렉트 대신 URI를 직접 rewrite한다.
함수 원본은 `docs/deploy/cloudfront-rewrite.js`에 있다.
