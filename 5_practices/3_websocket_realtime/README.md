# WebSocket Realtime — Kết nối thời gian thực với RxJS

## 🌟 Vấn đề

Chat, thông báo trực tuyến, bảng giá, scoreboard... đều cần dữ liệu **được đẩy từ server** theo thời gian thực — đúng mô hình Push mà RxJS sinh ra để xử lý. Nhưng quản lý một kết nối WebSocket thủ công thì nặng nhọc:

1. **Reconnect** — mạng chập chờn, server restart, tab sleep... kết nối đứt, phải tự kết nối lại.
2. **Heartbeat** — nhiều proxy sẽ ngắt kết nối "im lặng" sau vài chục giây; phải giữ kết nối bằng ping định kỳ.
3. **Chia sẻ kết nối** — nhiều thành phần của app cùng cần dữ liệu nhưng chỉ được mở **một** kết nối.
4. **Hủy an toàn** — đóng trang/component phải thật sự đóng kết nối.

RxJS có sẵn công cụ cho cả bốn: **`webSocket()`** — một Subject kết nối WebSocket.

> Tài liệu gốc: <https://rxjs.dev/api/webSocket/webSocket>.

## 💎 Giá trị cốt lõi

`webSocket(url)` trả về một **WebSocketSubject** — vừa là Observable vừa là Observer:

```typescript
import {
  fromEvent, interval, EMPTY, of,
} from 'rxjs';
import {
  webSocket, WebSocketSubject,
} from 'rxjs/webSocket';

const socket$ = webSocket('wss://example.com/chat');

socket$.subscribe((msg) => renderMessage(msg)); // nhận tin
socket$.next({ type: 'chat', body: 'Xin chào!' }); // gửi tin
```

Bốn đặc tính khiến nó khác `new WebSocket()` thô:

| Tính năng | `new WebSocket` thô | `webSocket()` của RxJS |
| --- | --- | --- |
| Nhận dữ liệu | `onmessage` + tự `JSON.parse` | Đã parse JSON, là stream |
| Gửi dữ liệu | `send(string)` | `next(obj)` — tự serialize |
| Gửi trước khi kết nối mở | Throws "invalid state" | Được xếp vào buffer, gửi khi socket mở |
| Ngắt/tự lặp lại | Tự viết tay | `retry` + backoff là xong reconnect |

> Lưu ý quan trọng: `WebSocketSubject` **không** tự reconnect. Kết nối đứt = stream error = hết. Phải tự thêm `retry` — chi tiết dưới đây.

## 🏗 Kiến trúc của một kết nối realtime đáng tin cậy

```
                    ┌──────────── reconnect (retry + backoff) ────────────┐
                    │                                                     │
webSocket(url) ──> messages$ (share) ──> lọc theo type ──> từng feature stream
       ▲                                                  │
       └── heartbeat (ping mỗi 30s, đóng nếu không thấy pong)
```

## 💡 Ví dụ hoàn chỉnh

```typescript
import { retry, share, filter, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

// ── 1. Factory tạo kết nối có retry + backoff ───────────────────
function connect(url: string): WebSocketSubject<ServerMsg> {
  return webSocket<ServerMsg>(url);
}

const socket$ = connect('wss://example.com/chat').pipe(
  // Kết nối đứt → error. retry để tự mở lại với backoff 1s, 2s, 4s...
  retry({ delay: (_err, count) => timer(Math.min(1000 * 2 ** (count - 1), 15_000)) }),
  share(), // MỘT kết nối duy nhất được dùng chung cho mọi subscriber
);

// ── 2. Chia luồng theo loại tin nhắn ────────────────────────────
const chatMessages$ = socket$.pipe(
  filter((m) => m.type === 'chat'),
);
const presence$ = socket$.pipe(
  filter((m) => m.type === 'presence'),
);

// Hai component, hai stream, MỘT kết nối nhờ share() ở trên
chatMessages$.subscribe(renderMessage);
presence$.subscribe(updatePresence);
```

### Heartbeat — giữ kết nối không bị ngắt

Nhiều gateway đóng kết nối nếu không thấy traffic trong ~60s. Gửi ping định kỳ **bên trong chính vòng đời của kết nối**:

```typescript
import { timer, EMPTY } from 'rxjs';
import { exhaustMap } from 'rxjs';

function withHeartbeat(socket: WebSocketSubject<ServerMsg | { type: 'ping' }>) {
  // Mỗi 30s gửi ping một lần. Nếu kết nối đã chết, next() sẽ error
  // → stream error → retry bên ngoài lo mở lại kết nối.
  timer(0, 30_000)
    .pipe(
      exhaustMap(() => {
        socket.next({ type: 'ping' });
        return EMPTY; // không cần giá trị, chỉ cần side effect
      })
    )
    .subscribe();
  return socket;
}
```

> Cách làm sạch hơn trong production: kết hợp ping/pong với `timeout` — nếu 35s không nhận được gì từ server, coi như chết và để `retry` mở lại:
>
> ```typescript
> const alive$ = socket$.pipe(timeout(35_000)); // không có tin nhắn nào trong 35s → error → retry mở lại
> ```

### Gửi tin nhắn — gửi trước khi mở kết nối

```typescript
import { fromEvent, EMPTY } from 'rxjs';
import { map, switchMap } from 'rxjs';

// Người dùng gõ tin nhắn → đẩy lên socket
fromEvent(sendBtn, 'click').pipe(
  map(() => ({ type: 'chat', body: input.value })),
  switchMap((msg) => {
    socket$.next(msg); // WebSocketSubject đợi mở kết nối rồi mới gửi
    return EMPTY;
  })
).subscribe();

// Lưu ý: nếu socket chưa từng được subscribe, next() đầu tiên sẽ kích hoạt kết nối.
// Nếu socket đang đứt (error), next() sẽ lỗi — kết hợp với retry ở trên để tự phục hồi.
```

## 🔌 Multiplexing — một socket, nhiều kênh logic

Khi một kết nối phải phục vụ nhiều loại dữ liệu nhưng muốn **subscribe đúng phần mình cần** (chỉ những ai nghe kênh đó mới nhận), dùng `multiplex`:

```typescript
import { webSocket } from 'rxjs/webSocket';

const socket$ = webSocket('wss://example.com/realtime');

// Tạo một stream riêng cho mỗi topic — chỉ mở "subscription" server-side khi ai đó nghe
const stockPrice$ = (symbol: string) =>
  socket$.multiplex(
    () => ({ type: 'subscribe', symbol }),   // gửi khi có subscriber
    () => ({ type: 'unsubscribe', symbol }), // gửi khi không còn ai nghe
    (msg) => msg.type === 'price' && msg.symbol === symbol
  );

stockPrice$('AAPL').subscribe((msg) => renderPrice(msg));
stockPrice$('GOOG').subscribe((msg) => renderPrice(msg));
// Cùng một kết nối vật lý, hai luồng logic độc lập.
```

## ⚠️ Những cạm bẫy

1. **Quên `retry`** — WebSocketSubject đứt một lần là chết vĩnh viễn; mọi subscriber sau đó nhận error ngay. Retry với backoff là bắt buộc với realtime.
2. **`share()` mà quên `shareReplay` cho tin nhắn đầu** — component subscribe muộn sẽ bỏ lỡ tin nhắn đầu tiên. Nếu cần "tin cuối cùng luôn có sẵn" (kiểu current user), dùng `shareReplay({ bufferSize: 1, refCount: true })`.
3. **Không đóng kết nối khi component hủy** — `refCount: true` (mặc định của `share()`) giúp kết nối tự đóng khi subscriber cuối rời đi; đừng chủ động tắt nó nếu không cần cache vĩnh viễn.
4. **Heartbeat mà không có cơ chế phát hiện chết** — gửi ping mỗi 30s không đủ; phải "phạt" sự im lặng (dùng `timeout` như trên) mới phát hiện được kết nối rác.
5. **Gửi dữ liệu nhạy cảm qua `wss://` public** — luôn xác thực qua token trong query/header lần bắt tay đầu tiên.

## 📌 Tóm tắt

| Nhu cầu | Giải pháp |
| --- | --- |
| Kết nối realtime | `webSocket(url)` từ `'rxjs/webSocket'` |
| Reconnect tự động | `retry({ delay: backoff })` sau socket stream |
| Một kết nối, nhiều consumer | `share()` (hoặc `shareReplay` nếu cần cache) |
| Chia kênh logic | `multiplex(subMsg, unsubMsg, filterFn)` |
| Giữ kết nối sống | heartbeat bằng `timer` + `next({type:'ping'})` |
| Phát hiện kết nối rác | `timeout(ms)` trên stream nhận tin |
| Đóng sạch khi rời trang | `refCount` qua `share()` hoặc `complete()` chủ động |

## 🧪 Cấu trúc thư mục mẫu cho app thật

Kết hợp các phần trên thành một module hoàn chỉnh:

```
src/
├── socket.ts        # tạo socket$: webSocket + retry + share + heartbeat
├── channels/
│   ├── chat.ts      # chatMessages$ = socket$.pipe(filter(type==='chat'))
│   └── presence.ts  # presence$ = socket$.pipe(filter(type==='presence'))
└── send.ts          # hàm send(msg): socket$.next(msg)
```

`src/socket.ts` gộp tất cả kỹ thuật của bài này:

```typescript
import { timer, Subject } from 'rxjs';
import { retry, share, timeout } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

type ServerMsg = { type: string; [key: string]: unknown };

function createSocket(url: string): WebSocketSubject<ServerMsg> {
  const socket = webSocket<ServerMsg>(url);

  // Heartbeat: gửi ping mỗi 30s trong lúc socket sống
  const heartbeat$ = timer(0, 30_000).subscribe(() => {
    try {
      socket.next({ type: 'ping' });
    } catch {
      /* socket chưa mở / đã chết — retry bên dưới sẽ lo */
    }
  });

  // Kết nối đứt → error → retry với backoff 1s, 2s, 4s... tối đa 15s
  const alive$ = socket.pipe(
    timeout(35_000), // 35s không có gì từ server → coi như chết
    retry({
      delay: (_err, count) => timer(Math.min(1000 * 2 ** (count - 1), 15_000)),
    }),
    share() // một kết nối, nhiều subscriber; subscriber cuối rời đi → kết nối đóng
  );

  return socket; // API cho next() gửi tin; alive$ là stream nhận tin
}
```

> Trong dự án thật, tách `next` (gửi) và `alive$` (nhận) thành hai biến export — đoạn trên gộp để minh họa trọn vẹn một khối.

## 🔍 Khi nào KHÔNG nên dùng WebSocket + RxJS?

- **Chỉ cần một request/response đơn giản** — `fetch` + `from(promise)` là đủ; WebSocket là quá mức cần thiết.
- **Cần retryable, stateless truy vấn** — HTTP có sẵn cache, CDN, status codes; WebSocket phải tự dựng hết.
- **Server không hỗ trợ heartbeat/reconnect protocol riêng** — khi đó hãy chuẩn hóa trước ở tầng server, đừng bọc RxJS quanh một kết nối vốn không đáng tin.

## ❓ Câu hỏi tự kiểm tra

1. Vì sao `webSocket()` không tự reconnect? (đáp: nó là một Subject — error là terminal event; reconnect là trách nhiệm của pipeline `retry`)
2. `share()` với `refCount` mặc định giúp gì khi component hủy? (đáp: subscriber cuối unsubscribe → kết nối thật sự đóng, không treo socket nền)
3. `multiplex` khác `filter` ở chỗ nào? (đáp: `multiplex` còn gửi subscribe/unsubscribe message lên server khi số subscriber tăng/giảm — `filter` chỉ lọc cục bộ)
4. Heartbeat chỉ gồm "gửi ping" — còn thiếu gì? (đáp: phát hiện im lặng bất thường — `timeout`)
