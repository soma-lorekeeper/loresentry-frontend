import { t } from "@/i18n";

import { ServiceError } from "../errors";

import type { ApiClient } from "./http";

interface ApiImageTicket {
  image_id: string;
  upload_url: string;
  method: string;
  /** 서명에 들어간 헤더. 그대로 실어야 S3 가 서명을 받아들인다 */
  headers: Record<string, string>;
}

/**
 * 브라우저가 S3 에 직접 올린다(`IMAGE_UPLOAD_S3.md`). 바이트는 BFF 를 지나지 않는다.
 *
 * 1. content 에 티켓을 받는다. 타입과 크기가 서명에 들어간다.
 * 2. 서명된 주소로 PUT 한다. S3 는 다른 출처라 쿠키·CSRF 헤더를 싣지 않는다.
 * 3. 다 올렸다고 알린다. content 가 객체를 확인한 뒤에야 문서에 붙일 수 있다.
 *
 * @return 문서에 붙일 이미지 id
 */
export async function uploadImage(
  client: ApiClient,
  projectId: string,
  image: Blob,
): Promise<string> {
  const ticket = await client.request<ApiImageTicket>(
    `/projects/${projectId}/images`,
    {
      method: "POST",
      body: {
        file_name: `image.${extensionOf(image.type)}`,
        content_type: image.type,
        size_bytes: image.size,
      },
      operation: "images.ticket",
    },
  );

  let uploaded: Response;
  try {
    uploaded = await fetch(ticket.upload_url, {
      method: ticket.method,
      headers: signedHeaders(ticket.headers),
      body: image,
      credentials: "omit",
    });
  } catch {
    throw new ServiceError(
      "network",
      t("이미지를 올리지 못했어요."),
      "images.upload",
    );
  }
  if (!uploaded.ok) {
    throw new ServiceError(
      "unknown",
      t("이미지를 올리지 못했어요."),
      "images.upload",
    );
  }

  await client.request<unknown>(
    `/projects/${projectId}/images/${ticket.image_id}/complete`,
    { method: "POST", operation: "images.complete" },
  );
  return ticket.image_id;
}

/**
 * `Content-Length` 는 브라우저가 본문에서 정한다. fetch 는 이 헤더를 직접 정할 수 없고, 넣으면
 * 조용히 버린다. 값은 서명과 같은 본문 크기라 그대로 맞는다.
 */
function signedHeaders(headers: Record<string, string>) {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "content-length") continue;
    result[name] = value;
  }
  return result;
}

function extensionOf(type: string) {
  if (type === "image/jpeg") return "jpg";
  return type.replace("image/", "") || "img";
}
