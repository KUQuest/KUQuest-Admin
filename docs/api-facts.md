# Backend API facts for apiClient and auth

## Scope and provenance

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | Environment ที่ยิงคือ local HTTP backend ที่เข้าถึงจากเครื่อง Linux ด้วย curl 8.5.0; ไม่ใช่ผลจาก mock server ของ frontend | curl ทุก request ใน Request inventory |
| CONFIRMED | Base URL คือ `http://localhost:5000`; Origin ที่ทดสอบหลักคือ `http://localhost:3000` | health, cors-preflight, signin-ok |
| CONFIRMED | วันที่ตรวจคือ 2026-10-04 ใน Asia/Bangkok; ช่วงผล API เริ่มที่ timestamp `2026-10-03T18:28:42.586Z` UTC; จบการเก็บหลักฐานที่ `2026-10-03T18:32:30.779Z` UTC | timestamp จาก health และเวลาจบ probe ที่บันทึก |
| CONFIRMED | ดาวน์โหลด OpenAPI จาก `http://localhost:5000/openapi/json` ได้ HTTP 200; document ระบุ OpenAPI 3.0.3 และ KUQuest API version 1.0.0 | spec |
| CONFIRMED | SHA-256 ของ raw OpenAPI body ที่ใช้คือ `2abefc816f9b7511acace98e712261d5d0556b055b8df54f8ed743aa811ab28f` | raw body ของ spec ที่ดึงด้วย curl |
| CONFIRMED | ยิง curl 32 requests; authentication สร้าง 2 test sessions และ sign-out สำเร็จทั้งสอง; ไม่เรียก business mutation เช่น approve/cancel payout หรือแก้ quest | Request inventory; signout-secondary-ok, signout-ok |
| UNKNOWN | Deployment revision ของ backend, production configuration และ browser/Next.js rewrite behavior จริง | ไม่ได้ทดสอบ deployment อื่นหรือ browser frontend |

สถานะใช้เฉพาะสามค่า: `CONFIRMED` คือพบจาก API จริงในขอบเขต request ที่ระบุ; `SPEC-ONLY` คือมีใน OpenAPI แต่ยังไม่ได้พิสูจน์ runtime; `UNKNOWN` คือยังไม่มีหลักฐานพอ ข้อเท็จจริงของ endpoint ที่ทดสอบไม่ใช่การยืนยันทุก endpoint

ค่าที่เป็น password, token, cookie value, cursor, identifiers และข้อมูลส่วนบุคคลในตัวอย่างถูกแทนด้วย `<redacted>` จึงนำตัวอย่างที่ปกปิดแล้วไป login ซ้ำไม่ได้ ไม่มีการเก็บ raw credentials/cookies ลงไฟล์ หลักฐานตัวอย่างด้านล่างมาจาก request/response ที่จับด้วย curl; JSON เปลี่ยนเพียง redaction และ formatting

## Transport

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | สำหรับ Origin `http://localhost:3000` response มี `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true` และ `Vary: Origin` | health, signin-ok, cors-preflight, admin-admin-cookie |
| CONFIRMED | preflight ของ sign-in ตอบ 204, body 0 bytes; allow headers คือ `Content-Type, Authorization, Idempotency-Key, If-Match`; allow methods คือ `GET, POST, PUT, DELETE, OPTIONS` | cors-preflight |
| CONFIRMED | preflight จาก `https://api-facts.invalid` ยังตอบ 204 แต่ไม่มี `Access-Control-Allow-Origin`; 204 เพียงอย่างเดียวจึงไม่แปลว่า Origin นั้นได้รับอนุญาต | cors-untrusted |
| SPEC-ONLY | security scheme แบบ cookie ระบุว่า browser ต้องส่ง requests พร้อม credentials | components.securitySchemes.betterAuthAdminSession |
| UNKNOWN | credentialed cross-origin fetch ใน browser, SameSite behavior ระหว่าง site ต่างกัน และ Next.js cookie forwarding ใช้งานจริงได้หรือไม่ | curl ไม่บังคับ CORS/SameSite แบบ browser; ไม่ได้เปิด frontend |
| CONFIRMED | auth sign-in success เป็น raw `{redirect, token, user}`; get-session เป็น raw `{session, user}` หรือ JSON `null`; ไม่มี `data` envelope | signin-ok, session-present, session-none |
| CONFIRMED | sign-out success เป็น `{success:true}` โดยไม่มี `data`; ไม่ใช่ empty response | signout-ok |
| CONFIRMED | health, overview, quest list และ payout read ที่ทดสอบใช้ `{success:true,data:...}` | health, admin-admin-cookie, limit-50, payout-list, payout-detail |
| CONFIRMED | unknown route ตอบ 404 พร้อม body ว่าง ขณะที่ get-session ไม่มี session ตอบ 200 พร้อม bytes ของ JSON `null`; สองกรณีนี้ไม่ใช่ wire body แบบเดียวกัน | unknown-route, session-none |
| UNKNOWN | business endpoint ใดตอบ success แบบ empty body/204 และสัญญาทั่วระบบสำหรับ empty body | พบ empty body เฉพาะ OPTIONS 204 และ unknown-route 404 ไม่ได้ทดสอบ business success 204 |
| CONFIRMED | curl sign-in สำเร็จทั้งกรณีส่ง Origin ที่ทดสอบและกรณีไม่มี Origin โดยไม่ส่ง CSRF-token header | signin-ok, signin-no-origin |
| CONFIRMED | get-session และ overview แบบ GET ที่ทดสอบใช้ได้โดยไม่ส่ง Origin หรือ CSRF-token header | session-no-origin, admin-no-origin |
| CONFIRMED | sign-out ที่มี cookie แต่ไม่มี Origin ตอบ 403 `MISSING_OR_NULL_ORIGIN`; Origin ที่ไม่ยอมรับตอบ 403 `INVALID_ORIGIN`; Origin `http://localhost:3000` ตอบ 200 โดยไม่ส่ง CSRF-token header | signout-no-origin, csrf-untrusted-signout, signout-ok |
| UNKNOWN | CSRF/Origin requirements ของ business POSTs และรายการ trusted origins ทั้งหมด | ไม่ได้ยิง business POSTs; ทดสอบเพียง localhost:3000 และ api-facts.invalid |

### CONFIRMED: Empty preflight and CORS headers

#### CONFIRMED: cors-preflight

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
OPTIONS /api/admin/auth/sign-in/email
Accept: application/json
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

```text
HTTP status: 204
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
access-control-allow-headers: Content-Type, Authorization, Idempotency-Key, If-Match
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
vary: Origin
content-length: 0


```

### CONFIRMED: Envelope success example

#### CONFIRMED: health

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /health
Accept: application/json
Origin: http://localhost:3000
```

```text
HTTP status: 200
content-type: application/json;charset=utf-8
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
vary: Origin

{
  "success": true,
  "data": {
    "status": "ok",
    "service": "kuquest-api-server",
    "timestamp": "2026-10-03T18:28:42.586Z"
  }
}
```

## Auth

### Cookie facts

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | successful sign-in ตั้ง `kuquest-admin.session_token` | signin-ok, signin-no-origin |
| CONFIRMED | `rememberMe:true` ที่ทดสอบได้ `Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`; ไม่มี `Secure`, `Domain` หรือ `Expires` attribute ใน Set-Cookie บรรทัดนั้นของ local HTTP backend | signin-ok |
| UNKNOWN | cookie attributes สำหรับ HTTPS/production หรือ `rememberMe:false` | ไม่ได้ยิงใน configuration เหล่านั้น |
| CONFIRMED | sign-out ส่ง Set-Cookie ที่มี `Max-Age=0; Path=/; HttpOnly; SameSite=Lax` สำหรับ `kuquest-admin.session_token`, `kuquest-admin.session_data` และ `kuquest-admin.dont_remember` | signout-ok |
| UNKNOWN | cookies `session_data` และ `dont_remember` ถูกสร้างเมื่อใด/ใช้อย่างไร | เห็นเฉพาะการล้างตอน sign-out ไม่ได้เห็นถูกตั้งเมื่อ login ที่ทดสอบ |
| CONFIRMED | ส่งเฉพาะ Admin session cookie แล้วอ่าน overview, quests และ payouts ได้ HTTP 200; ไม่มี bearer header และไม่มี student cookie ใน requests เหล่านั้น | admin-admin-cookie, limit-50, payout-list, payout-detail |
| CONFIRMED | ส่งค่า Admin session เดิมภายใต้ชื่อ `better-auth.session_token` แทน ได้ 401 จาก overview; นี่เป็นการทดสอบชื่อ cookie ไม่ใช่การทดสอบ session ของ student จริง | student-cookie-name |
| CONFIRMED | ไม่มี cookie ได้ 401 จาก overview; นำ Admin cookie เก่ากลับมาใช้หลัง sign-out ได้ 401 และ get-session ตอบ null | admin-no-cookie, admin-after-signout, session-after-signout |
| SPEC-ONLY | `/api/admin/auth/get-session` และ sign-out ระบุ `betterAuthAdminSession` แต่ `/api/v1/admin/*` operations ใน spec ใช้ `betterAuthSession` | OpenAPI operation.security; Known spec mismatches |
| UNKNOWN | cookie enforcement ของ admin operations ที่ไม่ได้ยิง รวมถึงสิทธิ์ของ enabled student หรือ disabled Admin จริง | มีเพียง enabled test Admin และ read endpoints ที่ระบุ |

### Sign-in

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | ส่ง JSON email/password ของ test account พร้อม rememberMe:true ได้ 200; password ผิดหนึ่งครั้งได้ 401 raw error | signin-ok, signin-401 |
| SPEC-ONLY | schema ต้องมี email และ password; password minLength=8/maxLength=25; rememberMe optional, default=true | paths./api/admin/auth/sign-in/email.post.requestBody |
| UNKNOWN | การบังคับ password boundaries และพฤติกรรมเมื่อ omit rememberMe จริง | ไม่ได้ทดสอบ boundary/omit |

#### CONFIRMED: signin-ok

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
POST /api/admin/auth/sign-in/email
Accept: application/json
Origin: http://localhost:3000
Content-Type: application/json

{
  "email": "<redacted>",
  "password": "<redacted>",
  "rememberMe": true
}
```

```text
HTTP status: 200
content-type: application/json
set-cookie: kuquest-admin.session_token=<redacted>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax

{
  "redirect": false,
  "token": "<redacted>",
  "user": {
    "name": "<redacted>",
    "email": "<redacted>",
    "emailVerified": true,
    "image": null,
    "createdAt": "<redacted>",
    "updatedAt": "<redacted>",
    "firstName": "<redacted>",
    "lastName": "<redacted>",
    "disabledAt": null,
    "id": "<redacted>"
  }
}
```

#### CONFIRMED: signin-401

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
POST /api/admin/auth/sign-in/email
Accept: application/json
Origin: http://localhost:3000
Content-Type: application/json

{
  "email": "<redacted>",
  "password": "<redacted>"
}
```

```text
HTTP status: 401
content-type: application/json

{
  "message": "Invalid email or password",
  "code": "INVALID_EMAIL_OR_PASSWORD"
}
```

### Get-session

#### CONFIRMED: session-present

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/admin/auth/get-session
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 200
content-type: application/json

{
  "session": {
    "expiresAt": "<redacted>",
    "token": "<redacted>",
    "createdAt": "<redacted>",
    "updatedAt": "<redacted>",
    "ipAddress": "<redacted>",
    "userAgent": "<redacted>",
    "userId": "<redacted>",
    "id": "<redacted>"
  },
  "user": {
    "name": "<redacted>",
    "email": "<redacted>",
    "emailVerified": true,
    "image": null,
    "createdAt": "<redacted>",
    "updatedAt": "<redacted>",
    "firstName": "<redacted>",
    "lastName": "<redacted>",
    "disabledAt": null,
    "id": "<redacted>"
  }
}
```

#### CONFIRMED: session-none

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/admin/auth/get-session
Accept: application/json
Origin: http://localhost:3000
```

```text
HTTP status: 200
content-type: application/json

null
```

### Sign-out and revoked-session read-back

#### CONFIRMED: signout-ok

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
POST /api/admin/auth/sign-out
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 200
content-type: application/json
set-cookie: kuquest-admin.session_token=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
set-cookie: kuquest-admin.session_data=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
set-cookie: kuquest-admin.dont_remember=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax

{
  "success": true
}
```

#### CONFIRMED: session-after-signout

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/admin/auth/get-session
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 200
content-type: application/json
set-cookie: kuquest-admin.session_token=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
set-cookie: kuquest-admin.session_data=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
set-cookie: kuquest-admin.dont_remember=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax

null
```

### Origin rejection examples

#### CONFIRMED: signout-no-origin

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
POST /api/admin/auth/sign-out
Accept: application/json
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 403
content-type: application/json

{
  "message": "Missing or null Origin",
  "code": "MISSING_OR_NULL_ORIGIN"
}
```

#### CONFIRMED: csrf-untrusted-signout

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
POST /api/admin/auth/sign-out
Accept: application/json
Origin: https://api-facts.invalid
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 403
content-type: application/json

{
  "message": "Invalid origin",
  "code": "INVALID_ORIGIN"
}
```

## Error format

| Status | HTTP status and scope | Body / observation | Evidence |
| --- | --- | --- | --- |
| CONFIRMED | 401, Admin sign-in with wrong password | raw `{message:"Invalid email or password",code:"INVALID_EMAIL_OR_PASSWORD"}` | signin-401 |
| CONFIRMED | 401, overview without valid Admin session | `{success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"}}` | admin-no-cookie, student-cookie-name, admin-after-signout |
| CONFIRMED | 403, auth sign-out Origin rejected | raw `{message,code}`: INVALID_ORIGIN หรือ MISSING_OR_NULL_ORIGIN | csrf-untrusted-signout, signout-no-origin |
| SPEC-ONLY | 403, admin resource permission denied | schema เป็น `{success:false,error:{code:string,message:string}}` | overview/quest/payout response schemas for 403 |
| UNKNOWN | 403 body/code ที่เกิดจาก disabled Admin หรือ role ไม่พอจริง | ยังไม่มีบัญชีสำหรับ scenario นี้ | ไม่มี permission-denied probe |
| CONFIRMED | 404, valid UUID but Quest missing | envelope; code QUEST_NOT_FOUND และ message Quest not found | missing-resource |
| CONFIRMED | 404, route ไม่มีจริง | ไม่มี response body; ไม่ใช่ JSON error envelope | unknown-route |
| CONFIRMED | 400, query/UUID validation | envelope; code VALIDATION; `error.message` เป็น string ที่บรรจุ JSON validation details ไม่ใช่ nested object | limit-51, invalid-limit, member-invalid-id |
| SPEC-ONLY | 409, payout approve/cancel | spec มี `{success:false,error:{code:string,message:string}}` | payout command response 409 |
| UNKNOWN | 409 runtime code/message และสาเหตุจาก stale version หรือ idempotency conflict | ไม่ยิง payout/business mutation เพื่อสร้าง conflict | ไม่มี 409 response |
| UNKNOWN | 412 runtime body และเลือก 409 หรือ 412 เมื่อ precondition ล้มเหลว | payout approve/cancel ที่ตรวจไม่มี response 412 ใน spec; ไม่ได้ทดสอบ command | ไม่มี 412 response |
| UNKNOWN | 422 runtime body หรือ endpoint ใดใช้ 422 | invalid limit และ invalid member ID ที่ยิงได้ 400 ไม่ใช่ 422; ไม่สรุปว่าไม่มี 422 ทั้ง backend | ไม่มี 422 response |
| SPEC-ONLY | 429, Admin search | spec มี error envelope `{success:false,error:{code:string,message:string}}` | paths./api/v1/admin/search.get.responses.429 |
| UNKNOWN | 429 runtime code, Retry-After และ rate-limit threshold | ไม่ยิงถี่เพื่อทำให้ rate limit | ไม่มี 429 response |

### CONFIRMED: Resource 401

#### CONFIRMED: admin-no-cookie

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/overview
Accept: application/json
Origin: http://localhost:3000
```

```text
HTTP status: 401
content-type: application/json;charset=utf-8

{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  }
}
```

### CONFIRMED: Resource 404 versus route 404

#### CONFIRMED: missing-resource

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/quests/<redacted>
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 404
content-type: application/json;charset=utf-8

{
  "success": false,
  "error": {
    "code": "QUEST_NOT_FOUND",
    "message": "Quest not found"
  }
}
```

#### CONFIRMED: unknown-route

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/api-facts-nonexistent
Accept: application/json
Origin: http://localhost:3000
```

```text
HTTP status: 404
content-length: 0


```

### CONFIRMED: Validation response actually returned 400

#### CONFIRMED: limit-51

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/quests?limit=51
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 400
content-type: application/json;charset=utf-8

{
  "success": false,
  "error": {
    "code": "VALIDATION",
    "message": "{\n  \"type\": \"validation\",\n  \"on\": \"property\",\n  \"property\": \"root\",\n  \"message\": \"Expected integer to be less or equal to 50\",\n  \"summary\": \"Expected integer to be less or equal to 50\",\n  \"found\": 51,\n  \"errors\": [\n    {\n      \"summary\": \"Expected integer to be less or equal to 50\",\n      \"type\": 24,\n      \"schema\": {\n        \"minimum\": 1,\n        \"maximum\": 50,\n        \"type\": \"integer\"\n      },\n      \"path\": \"\",\n      \"value\": 51,\n      \"message\": \"Expected integer to be less or equal to 50\",\n      \"errors\": []\n    }\n  ]\n}"
  }
}
```

## Pagination

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | Quest list ใช้ query `limit`, `sort` และ `cursor`; response เป็น envelope ที่ `data.items`, `data.nextCursor`, `data.totalCount`, `data.countsByStatus` | quests-page-1, quests-last-page |
| CONFIRMED | หน้าแรก limit=16 ได้ 16 items และ nextCursor string; ส่ง cursor นั้นพร้อม query เดิมได้หน้าสุดท้าย 1 item, nextCursor=null, totalCount=17 | quests-page-1, quests-last-page |
| CONFIRMED | หน้าสุดท้ายอาจมี items ไม่ว่าง; จบ pagination ที่ nextCursor=null ไม่ใช่รอ items=[] | quests-last-page |
| CONFIRMED | query ที่ไม่ match ได้ items=[], nextCursor=null, totalCount=0 และ countsByStatus ทุกค่าเป็น 0 | quests-empty-filter |
| CONFIRMED | Quest limit=50 ได้ 200; limit=51 ได้ 400 VALIDATION | limit-50, limit-51 |
| SPEC-ONLY | Quest และ Payout list limit มี minimum=1/maximum=50; minimum boundary ยังไม่ได้ยิง | query schemas ของ list endpoints ที่ระบุ |
| CONFIRMED | Payout list ที่ทดสอบมีเฉพาะ data.items และ data.nextCursor; ไม่มี totalCount/countsByStatus แบบ Quest list | payout-list |
| UNKNOWN | limit, cursor semantics, totals และ last-page behavior ของ list endpoints อื่น | ไม่ generalize จาก Quest/Payout list ไปทุก resource |

### CONFIRMED: Last page after following actual nextCursor

#### CONFIRMED: quests-last-page

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/quests?limit=16&sort=newest&cursor=<redacted>
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 200
content-type: application/json;charset=utf-8

{
  "success": true,
  "data": {
    "items": [
      {
        "id": "<redacted>",
        "displayId": "QST-000012",
        "apiVersion": "v1",
        "version": 1,
        "title": "[Admin Demo] Failed Dispute Quest 01",
        "questStatus": "QUEST_FAILED",
        "mode": "FIRST_COME_FIRST_SERVED",
        "participation": "SINGLE",
        "headcount": 1,
        "rewardSatang": 10000,
        "questFundingTotalSatang": 10000,
        "startTime": "2026-10-02T05:55:50.180Z",
        "dueAt": "2026-10-02T06:55:50.180Z",
        "hiddenAt": null,
        "createdAt": "2026-10-02T05:25:50.180Z",
        "updatedAt": "2026-10-02T07:55:50.180Z",
        "hirer": {
          "id": "<redacted>",
          "studentId": "<redacted>",
          "firstName": "<redacted>",
          "lastName": "<redacted>",
          "email": "<redacted>"
        }
      }
    ],
    "nextCursor": null,
    "totalCount": 17,
    "countsByStatus": {
      "QUEST_DRAFT": 0,
      "QUEST_OPEN": 10,
      "QUEST_AWAITING_CONSENT": 0,
      "QUEST_ASSIGNED": 0,
      "QUEST_IN_PROGRESS": 1,
      "QUEST_SUBMITTED": 0,
      "QUEST_APPROVED": 0,
      "QUEST_REWORK": 0,
      "QUEST_COMPLETED": 0,
      "QUEST_CANCELLED": 0,
      "QUEST_FAILED": 6
    }
  }
}
```

### CONFIRMED: Empty filtered result

#### CONFIRMED: quests-empty-filter

Request/response ที่เก็บจาก curl จริง: request แสดง method/path และ headers ที่ส่ง; response แสดง status และ headers ที่เกี่ยวข้อง โดย normalize ชื่อ response headers เป็นตัวพิมพ์เล็ก ปกปิดค่าลับและข้อมูลส่วนบุคคล และจัด indentation ของ JSON ใหม่ ไม่ใช่ตัวอย่างจาก spec หรือ transcript แบบ byte-for-byte

```http
GET /api/v1/admin/quests?limit=16&q=api-facts-no-match-20261004
Accept: application/json
Origin: http://localhost:3000
Cookie: kuquest-admin.session_token=<redacted>
```

```text
HTTP status: 200
content-type: application/json;charset=utf-8

{
  "success": true,
  "data": {
    "items": [],
    "nextCursor": null,
    "totalCount": 0,
    "countsByStatus": {
      "QUEST_DRAFT": 0,
      "QUEST_OPEN": 0,
      "QUEST_AWAITING_CONSENT": 0,
      "QUEST_ASSIGNED": 0,
      "QUEST_IN_PROGRESS": 0,
      "QUEST_SUBMITTED": 0,
      "QUEST_APPROVED": 0,
      "QUEST_REWORK": 0,
      "QUEST_COMPLETED": 0,
      "QUEST_CANCELLED": 0,
      "QUEST_FAILED": 0
    }
  }
}
```

## Concurrency

| Status | Fact | Evidence |
| --- | --- | --- |
| CONFIRMED | Payout detail ที่อ่านมี numeric `data.version=1` และไม่มี ETag response header; Payout list item ก็มี version | payout-detail, payout-list |
| SPEC-ONLY | Payout approve/cancel ต้องมี `if-match` header; schema เป็น string length 1..100, pattern `^[1-9]\d*$` ไม่ใช่ quoted ETag syntax | paths./api/v1/admin/payouts/{payoutId}/approve.post.parameters และ cancel.post.parameters |
| UNKNOWN | server ใช้ if-match เทียบกับ data.version จริงอย่างไร และตอบอะไรเมื่อ version ไม่ตรง | พิสูจน์ได้เพียงแหล่งข้อมูล version จาก read response; ไม่ได้ส่ง command จึงยังไม่ยืนยัน precondition behavior |
| SPEC-ONLY | Payout approve/cancel ต้องมี `idempotency-key`; schema เป็น string length 1..200, pattern `\S`; body ต้องมี reasonCode | payout approve/cancel parameters และ requestBody |
| UNKNOWN | idempotency retention, scope, replay response, same-key/different-body behavior และ key reuse rules | spec header schema ไม่อธิบายรายละเอียดเหล่านี้; ไม่ได้ทดลอง |
| UNKNOWN | Concurrency headers ของ endpoints อื่นใน runtime | ไม่สรุปว่า rules ของ payout apply ทั้งระบบ |

CONFIRMED: แหล่ง version ที่สังเกตได้คือ body ของ payout read response ไม่ใช่ ETag ใน response ที่ยิงครั้งนี้; การนำ version ไปเป็น if-match ยังเป็นการจับคู่ตาม schema ไม่ใช่ command verification

## Known spec mismatches

| Status | Mismatch or limitation | Evidence |
| --- | --- | --- |
| CONFIRMED | OpenAPI ของ overview/quests/payouts ระบุ betterAuthSession ซึ่งนิยามเป็น better-auth.session_token แต่ requests ที่ยิงสำเร็จใช้เฉพาะ kuquest-admin.session_token; overview ไม่ยอมรับการเปลี่ยนชื่อ cookie ของ Admin token ไปเป็น student cookie name | spec + admin-admin-cookie, student-cookie-name, limit-50, payout-list |
| SPEC-ONLY | การระบุ betterAuthSession นี้ยังปรากฏใน /api/v1/admin/* operations อื่นใน spec; runtime ของทุก operation ยังไม่ได้ยืนยัน | OpenAPI operation.security |
| CONFIRMED | sign-out มี 403 runtime จาก Origin validation แต่ spec ของ sign-out มีเพียง 200/500 และไม่มี required Origin header ใน parameters | spec + signout-no-origin, csrf-untrusted-signout |
| CONFIRMED | AuthSession schema ไม่ได้อธิบาย field token แต่ get-session runtime ส่ง session.token มาด้วย; เป็น field ที่ schema ยังไม่ครอบคลุม ไม่ใช่การยืนยันว่า response ผิด schema เพราะ schema ไม่ห้าม extra properties | components.schemas.AuthSession + session-present |
| CONFIRMED | Runtime CORS allow-methods ของ preflight ที่ยิงไม่มี PATCH แม้มี PATCH operations ที่อื่นใน spec | cors-preflight + OpenAPI paths ที่ประกาศ PATCH |
| UNKNOWN | browser PATCH จะถูกปฏิเสธจริงหรือไม่ และการตั้งค่า CORS ของ production | ไม่ได้ยิง PATCH/browser; ไม่ใช่ข้อสรุปว่า PATCH ใช้งานไม่ได้ |

## Open questions

| Status | Question | Missing evidence |
| --- | --- | --- |
| UNKNOWN | backend จะเปลี่ยน Admin resource security scheme เป็น betterAuthAdminSession เมื่อใด และ untested admin operations ยอมรับ cookie ใด | ยืนยัน runtime ได้เฉพาะ read endpoints ที่ระบุ |
| UNKNOWN | browser direct cross-origin calls และ Next.js same-origin forwarding ส่ง/ล้าง cookies จริงครบหรือไม่ | ต้อง browser smoke ผ่าน frontend origin จริง |
| UNKNOWN | production Secure/Domain/SameSite และ trusted-origin allowlist คืออะไร | local HTTP tests ไม่ตอบแทน production |
| UNKNOWN | business mutations ต้องส่ง Origin หรือ CSRF mechanism ใด; auth Origin failures ควรเพิ่มใน OpenAPI หรือไม่ | ไม่ยิง business mutation; spec ไม่ระบุข้อบังคับ Origin |
| UNKNOWN | disabled Admin และ student session จริงได้ 401/403 รูปแบบใด | ไม่มี identities สำหรับ scenario นี้ |
| UNKNOWN | stale-version conflict เป็น 409 หรือ 412 และ response code/message คืออะไร | ต้อง isolated command fixture ที่ไม่กระทบข้อมูลใช้งาน |
| UNKNOWN | มี 422 ที่ endpoints ใด หรือ validation ทุก route ใช้ 400 | ที่ยิงพบเพียง validation 400 |
| UNKNOWN | rate-limit threshold และ Retry-After ของ search คืออะไร | ไม่ได้กระตุ้น 429 |
| UNKNOWN | success empty-body/204 มีใน business operations ใด | empty-body evidence มีเฉพาะ preflight และ unknown route |
| UNKNOWN | pagination ของ resource อื่นมี fields/default limit/last-page เหมือนหรือต่างจากที่ตรวจอย่างไร | ทดสอบ cursor traversal เฉพาะ Quest; Payout อ่านหน้าแรกและ detail เท่านั้น |

## Request inventory

CONFIRMED: ตารางนี้คือ curl ที่ส่งจริง 32 requests โดยหมายเลขเป็นลำดับการเก็บผล; requests บางชุดยิงพร้อมกัน Origin ที่ไม่ระบุเป็น localhost:3000 ตามคอลัมน์ Conditions คำว่า Admin cookie หมายถึงค่าที่ได้จาก sign-in จริงและปกปิดทั้งหมด

| Status | No. | Probe | Method and path | Conditions | HTTP |
| --- | --- | --- | --- | --- | --- |

| CONFIRMED | 1 | spec | `GET /openapi/json` | ไม่มี cookie/Origin | 200 |
| CONFIRMED | 2 | session-none | `GET /api/admin/auth/get-session` | ไม่มี cookie | 200 |
| CONFIRMED | 3 | health | `GET /health` | Origin localhost:3000 | 200 |
| CONFIRMED | 4 | admin-no-cookie | `GET /api/v1/admin/overview` | ไม่มี cookie | 401 |
| CONFIRMED | 5 | cors-preflight | `OPTIONS /api/admin/auth/sign-in/email` | OPTIONS; Origin localhost:3000 | 204 |
| CONFIRMED | 6 | unknown-route | `GET /api/v1/admin/api-facts-nonexistent` | ไม่มี cookie | 404 |
| CONFIRMED | 7 | signin-ok | `POST /api/admin/auth/sign-in/email` | correct credentials; rememberMe:true; ไม่มี CSRF header | 200 |
| CONFIRMED | 8 | signin-401 | `POST /api/admin/auth/sign-in/email` | wrong password; ไม่มี cookie | 401 |
| CONFIRMED | 9 | session-present | `GET /api/admin/auth/get-session` | Admin cookie | 200 |
| CONFIRMED | 10 | session-no-origin | `GET /api/admin/auth/get-session` | Admin cookie; ไม่มี Origin | 200 |
| CONFIRMED | 11 | admin-admin-cookie | `GET /api/v1/admin/overview` | Admin cookie | 200 |
| CONFIRMED | 12 | admin-no-origin | `GET /api/v1/admin/overview` | Admin cookie; ไม่มี Origin | 200 |
| CONFIRMED | 13 | cors-untrusted | `OPTIONS /api/admin/auth/sign-in/email` | OPTIONS; Origin https://api-facts.invalid | 204 |
| CONFIRMED | 14 | csrf-untrusted-signout | `POST /api/admin/auth/sign-out` | Admin cookie; Origin https://api-facts.invalid | 403 |
| CONFIRMED | 15 | student-cookie-name | `GET /api/v1/admin/overview` | Admin token ภายใต้ชื่อ better-auth.session_token | 401 |
| CONFIRMED | 16 | limit-51 | `GET /api/v1/admin/quests?limit=51` | Admin cookie | 400 |
| CONFIRMED | 17 | invalid-limit | `GET /api/v1/admin/quests?limit=not-a-number` | Admin cookie | 400 |
| CONFIRMED | 18 | missing-resource | `GET /api/v1/admin/quests/<redacted>` | Admin cookie; UUID ที่ไม่มี record | 404 |
| CONFIRMED | 19 | limit-50 | `GET /api/v1/admin/quests?limit=50` | Admin cookie | 200 |
| CONFIRMED | 20 | quests-page-1 | `GET /api/v1/admin/quests?limit=16&sort=newest` | Admin cookie; limit 16 | 200 |
| CONFIRMED | 21 | quests-last-page | `GET /api/v1/admin/quests?limit=16&sort=newest&cursor=<redacted>` | Admin cookie; cursor จากหน้าแรก | 200 |
| CONFIRMED | 22 | quests-empty-filter | `GET /api/v1/admin/quests?limit=16&q=api-facts-no-match-20261004` | Admin cookie; query ไม่ match | 200 |
| CONFIRMED | 23 | payout-list | `GET /api/v1/admin/payouts?limit=1` | Admin cookie | 200 |
| CONFIRMED | 24 | payout-detail | `GET /api/v1/admin/payouts/<redacted>` | Admin cookie; id จาก list | 200 |
| CONFIRMED | 25 | signin-no-origin | `POST /api/admin/auth/sign-in/email` | correct credentials; rememberMe:true; ไม่มี Origin/CSRF header | 200 |
| CONFIRMED | 26 | signout-no-origin | `POST /api/admin/auth/sign-out` | secondary Admin cookie; ไม่มี Origin | 403 |
| CONFIRMED | 27 | session-secondary-after-signout | `GET /api/admin/auth/get-session` | secondary cookie หลัง sign-out ถูกปฏิเสธ | 200 |
| CONFIRMED | 28 | member-invalid-id | `GET /api/v1/admin/members/not-a-uuid` | Admin cookie; invalid UUID | 400 |
| CONFIRMED | 29 | signout-secondary-ok | `POST /api/admin/auth/sign-out` | secondary Admin cookie; Origin localhost:3000 | 200 |
| CONFIRMED | 30 | signout-ok | `POST /api/admin/auth/sign-out` | primary Admin cookie; Origin localhost:3000 | 200 |
| CONFIRMED | 31 | admin-after-signout | `GET /api/v1/admin/overview` | นำ primary cookie ที่ revoked แล้วมาใช้อีกครั้ง | 401 |
| CONFIRMED | 32 | session-after-signout | `GET /api/admin/auth/get-session` | นำ primary cookie ที่ revoked แล้วมาใช้อีกครั้ง | 200 |
