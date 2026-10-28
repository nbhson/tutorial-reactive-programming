# Imperative vs Reactive

## Giá trị cốt lõi

Hiểu được sự thay đổi tư duy từ **"gán giá trị rồi chủ động cập nhật"** (Imperative) sang **"khai báo quan hệ giữa dữ liệu"** (Reactive). Đây là bước đầu tiên và quan trọng nhất trước khi chạm vào RxJS.

---

## 1. Imperative (Mệnh lệnh)

Trong lập trình mệnh lệnh, bạn viết code mô tả **từng bước** phải làm gì: gán giá trị, rồi tự tay cập nhật mọi nơi phụ thuộc vào giá trị đó.

```javascript
let a = 10;
let b = a + 5;
console.log(b); // 15

a = 20;
console.log(b); // vẫn là 15! b không tự thay đổi trừ khi ta gán lại.
```

Khi `a` thay đổi, **bạn** phải nhớ và tự cập nhật mọi thứ phụ thuộc vào `a`:

```javascript
let price = 100;
let quantity = 2;

function renderTotal() {
  document.querySelector('#total').textContent = price * quantity;
}

// Mỗi khi một nguồn dữ liệu đổi, phải TỰ GỌI cập nhật ở đúng chỗ
inputQuantity.addEventListener('change', (e) => {
  quantity = +e.target.value;
  renderTotal(); // quên dòng này → UI hiện số sai
});
inputPrice.addEventListener('input', (e) => {
  price = +e.target.value;
  renderTotal(); // ...và ở đây nữa
});
// Càng nhiều nguồn dữ liệu, càng nhiều chỗ phải gọi render — bug rơi vào chỗ quên gọi.
```

Đây gọi là **gián tiếp phức tạp hóa**: dữ liệu (price, quantity) và giao diện (total) bị nối với nhau bằng các lệnh gọi rải rác.

## 2. Reactive (Phản ứng)

Trong lập trình phản ứng, `b` **tự động cập nhật** khi `a` thay đổi. Hãy tưởng tượng `b` là một ô trong Excel có công thức `= A1 + 5` — bạn không "chạy lại công thức", công thức luôn đúng.

```javascript
// Giả mã (Pseudo-code)
let a$ = new BehaviorSubject(10);   // nguồn giá trị a
let b$ = a$.map((x) => x + 5);      // b KHÔNG phải số — b là "công thức" gắn với a

b$.subscribe((val) => console.log(val)); // 15

a$.next(20);
// b$ tự động cập nhật và log ra 25 — không ai gọi lại gì cả!
```

Đó chính là ô Excel: khi ô A1 đổi, ô B1 (có công thức `=A1+5`) tự động đổi. Trong Reactive Programming:

- `a$` là **nguồn** (source) phát giá trị theo thời gian.
- `b$` là **quan hệ đã khai báo sẵn** giữa b và a.
- Khi `a` phát giá trị mới, giá trị mới của `b` tự động chảy theo dòng chảy đã khai báo.

## 3. Ví dụ thật: cùng một bài toán, hai cách viết

Bài toán: một ô nhập số lượng, tổng tiền phải luôn bằng giá × số lượng.

```javascript
// ❌ Imperative — ba điểm phải tự quản lý: biến state, hàm cập nhật, chỗ gọi lại
let quantity = 1;
const UNIT_PRICE = 50000;

function updateTotal() {
  totalEl.textContent = (quantity * UNIT_PRICE).toLocaleString('vi-VN');
}
quantityInput.addEventListener('input', (e) => {
  quantity = Math.max(1, +e.target.value || 1);
  updateTotal();
});
updateTotal(); // đừng quên chạy lần đầu!
```

```javascript
// ✅ Reactive — khai báo quan hệ một lần, mọi cập nhật sau đó tự động
import { fromEvent, BehaviorSubject, map, combineLatest } from 'rxjs';

const quantity$ = fromEvent(quantityInput, 'input').pipe(
  map((e) => Math.max(1, +e.target.value || 1))
);
const unitPrice$ = new BehaviorSubject(50000);

combineLatest([quantity$, unitPrice$])
  .pipe(map(([q, p]) => q * p))
  .subscribe((total) => {
    totalEl.textContent = total.toLocaleString('vi-VN');
  });
// Giá thay đổi (khuyến mãi...) → chỉ cần unitPrice$.next(giáMới),
// tổng tiền tự cập nhật. Không có hàm updateXxx nào phải gọi tay.
```

Chú ý trong bản Reactive: **không có biến trung gian bị quên cập nhật**, không có hàm "sync UI" phải nhớ gọi ở mỗi nhánh. Bạn khai báo **một lần** quan hệ `total = quantity × price`, và luồng đảm bảo mọi thay đổi chảy đúng.

## 4. Tư duy "khai báo quan hệ" áp dụng vào UI

Trong app thực tế, dữ liệu thay đổi liên tục: sự kiện chuột, response API, WebSocket, timer. Với tư duy Imperative, mỗi nguồn thay đổi đều là một chỗ code phải "đẩy" UI cập nhật:

```
sự kiện A ──> cập nhật UI thủ công
sự kiện B ──> cập nhật UI thủ công
API trả về ──> cập nhật UI thủ công
```

Với tư duy Reactive, bạn khai báo **state = f(tất cả các nguồn)** một lần duy nhất:

```
sự kiện A ─┐
sự kiện B ─┼──> state$ ──> UI tự render khi state thay đổi
API ───────┘
```

Đây chính là lý do các thư viện hiện đại (Angular signals, Svelte, Vue) đều mang tính "reactive" — và RxJS là cách viết reactive mạnh nhất trong hệ sinh thái JS trước khi signals ra đời.

## 5. Bốn điểm khác biệt cốt lõi

| Tiêu chí | Imperative | Reactive |
| --- | --- | --- |
| Thể hiện quan hệ dữ liệu | Gọi hàm cập nhật thủ công tại mỗi nguồn | Khai báo 1 lần, tự chảy theo |
| Trạng thái trung gian | Nhiều biến rời rạc, dễ lệch | Mỗi nguồn là một stream duy nhất |
| Số lượng nguồn thay đổi | Thêm nguồn = thêm chỗ phải gọi update | Thêm nguồn = thêm một dòng trong `pipe`/`combineLatest` |
| Suy luận về bug | "Ở đâu đã quên cập nhật?" | "Quan hệ khai báo sai ở đâu?" |

## 6. Thêm một ví dụ: đếm ngược xuất hàng

Yêu cầu: một nút bấm sẽ bắt đầu đếm ngược 10 giây; bấm lần nữa thì hủy.

```javascript
// ❌ Imperative — hai biến, hai timer, ba nhánh if
let countdown = 0;
let timerId = null;

startBtn.addEventListener('click', () => {
  if (timerId) {
    clearInterval(timerId); // hủy phiên trước
    timerId = null;
    countdownEl.textContent = 'Đã hủy';
    return;
  }
  countdown = 10;
  timerId = setInterval(() => {
    countdown--;
    countdownEl.textContent = `Còn ${countdown}s`;
    if (countdown <= 0) {
      clearInterval(timerId);
      timerId = null;
      countdownEl.textContent = 'Xong!';
    }
  }, 1000);
});
```

```javascript
// ✅ Reactive — mô tả luồng một lần
import { fromEvent, interval, of } from 'rxjs';
import { map, switchMap, scan, takeWhile, startWith } from 'rxjs';

const clicks$ = fromEvent(startBtn, 'click');

clicks$.pipe(
  switchMap(() =>                          // click mới → hủy phiên đếm cũ
    interval(1000).pipe(
      map((i) => 10 - i),
      startWith(10),
      takeWhile((n) => n >= 0, true)
    )
  ),
  scan((state, n) => {
    if (n === 0) return 'Xong!';
    return `Còn ${n}s`;
  }, 'Sẵn sàng')
).subscribe((text) => (countdownEl.textContent = text));
```

So sánh trực tiếp:

- Bản Imperative có **3 trạng thái ẩn** phải quản tay: `countdown`, `timerId`, và nhánh "đang chạy hay không" — mỗi bản vá sau này phải nhớ cả ba.
- Bản Reactive không có biến nào ngoài stream. "Hủy phiên cũ" là hành vi **mặc định của `switchMap`**, không phải một nhánh `if` phải nhớ viết.

## 7. Ghi nhớ

- Imperative: **bạn** đi cập nhật mọi thứ. Reactive: **luồng** cập nhật mọi thứ cho bạn.
- `b = a + 1` là một giá trị chụp tại một thời điểm; `b$ = a$.pipe(map((a) => a + 1))` là một **quan hệ sống** theo thời gian.
- Reactive không phủ nhận Imperative — mọi dòng code cuối cùng vẫn là mệnh lệnh. Reactive thay đổi ở chỗ: **nơi nối dữ liệu vào nhau** trở thành khai báo thay vì thủ công.
- Dấu hiệu bạn cần Reactive: khi số chỗ phải "nhớ cập nhật" tăng theo số nguồn dữ liệu.

Bài sau: [1_sync_vs_async](../1_sync_vs_async) — vì sao Callback và Promise chưa đủ để xây dựng các quan hệ này.
