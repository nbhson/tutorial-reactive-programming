# Testing Asynchronous Streams — TestScheduler thực hành

## Giá trị cốt lõi

Viết test cho code bất đồng bộ mà **không cần `setTimeout`, không cần `await`, không chờ đợi thật**. Toàn bộ thời gian được "ảo hóa" (virtual time) — test chạy tức thì nhưng vẫn chính xác đến từng millisecond.

Tài liệu gốc: <https://rxjs.dev/guide/testing> và <https://rxjs.dev/guide/marble-diagrams>.

---

## 1. Vấn đề: vì sao test async code khó?

Giả sử bạn cần test `debounceTime(300)`:

```typescript
// ❌ Test "ngây thơ" — chờ thời gian thật
it('debounces input', (done) => {
  const results: string[] = [];
  source$.pipe(debounceTime(300)).subscribe((v) => results.push(v));

  setTimeout(() => {
    expect(results).toEqual(['c']); // phải chờ 300+ ms thật
    done();
  }, 400);
});
```

Vấn đề:
- Test chậm (mỗi test chờ thời gian thực của timer).
- Dễ flaky khi máy CI chậm.
- Không kiểm soát được thứ tự sự kiện phức tạp (emit, hủy, resubscribe...).

**Giải pháp của RxJS: `TestScheduler`.** Nó thay thế toàn bộ "đồng hồ" mà các operator dùng (`AsyncScheduler`) bằng một đồng hồ ảo, mà bạn điều khiển bằng chuỗi ký tự — **marble diagram**.

> Giới hạn chính thức (trích rxjs.dev/guide/testing): TestScheduler chỉ ảo hóa được code dùng **RxJS scheduler** (`debounceTime`, `delay`, `throttleTime`, `timer`, `interval`...). Code tiêu thụ **Promise** (ví dụ `from(fetch(...))`) **không** test được bằng TestScheduler — phần đó phải test theo cách truyền thống (xem mục 8).

---

## 2. Setup TestScheduler

`TestScheduler` nằm trong `'rxjs/testing'` (đây là entry point riêng duy nhất còn lại ngoài `'rxjs'` ở RxJS 7):

```typescript
import { TestScheduler } from 'rxjs/testing';

// Tham số đầu vào là hàm so sánh — TestScheduler sẽ gọi nó để assert.
// Bạn nối nó vào assert của framework đang dùng (Jest, Vitest, chai...).
const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected); // Jest / Vitest
  // chai: expect(actual).to.deep.equal(expected);
});
```

Mọi test đều nằm trong `testScheduler.run()`:

```typescript
it('...', () => {
  testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions, flush, time }) => {
    // ... viết test ở đây
  });
});
```

> **Quan trọng:** trong lúc callback `run()` chạy, mọi operator dùng timer (`delay`, `debounceTime`...) **tự động** dùng TestScheduler làm scheduler — bạn không cần truyền nó vào như RxJS 5/6.

---

## 3. Các helper trong `run()`

| Helper | Vai trò |
| --- | --- |
| `cold(marbles, values?, error?)` | Tạo **cold** observable — subscription bắt đầu tại frame 0, mỗi lần subscribe chạy lại từ đầu |
| `hot(marbles, values?, error?)` | Tạo **hot** observable (như Subject đã chạy sẵn) — ký tự `^` đánh dấu điểm "thời điểm 0" của người test |
| `expectObservable(observable).toBe(marbles, values?, error?)` | Hẹn giờ assertion: chạy khi scheduler flush (cuối callback hoặc khi bạn gọi `flush()`) |
| `expectSubscriptions(logs).toBe(marbles)` | Assert thời điểm subscribe/unsubscribe (`^` = subscribe, `!` = unsubscribe) |
| `time(marbles)` | Đổi chuỗi marble thành số frame — dùng làm tham số duration cho operator |
| `flush()` | Chạy toàn bộ virtual time ngay lập tức (thường không cần gọi — `run()` tự flush khi callback trả về) |

Lưu ý: `expectObservable` **không assert ngay** — nó lên lịch assert khi flush. Vì vậy đừng đặt `expect(...)` đồng bộ của Jest ngay trong callback (trừ khi bạn đã gọi `flush()` trước — xem mục 7).

---

## 4. Marble syntax — từng ký tự

Bên trong `testScheduler.run()`, 1 frame = **1 virtual millisecond** (`frameTimeFactor = 1`). Ký tự đầu tiên của chuỗi là frame 0.

| Ký tự | Ý nghĩa |
| --- | --- |
| `'-'` | 1 frame thời gian trôi qua |
| `' '` | Khoảng trắng ngang — bị bỏ qua, chỉ dùng để căn thẳng các dòng marble |
| `'\|'` | `complete()` — stream kết thúc thành công |
| `'#'` | `error()` — stream kết thúc do lỗi |
| `[a-z0-9]` | `next(value)` — một giá trị được emit; ý nghĩa của chữ do object `values` quy định |
| `'()'` | Nhóm đồng bộ: nhiều sự kiện trong cùng 1 frame, ví dụ `'(abc)'` |
| `'^'` | Điểm subscribe — **chỉ dùng cho `hot`** và subscription marbles |
| `'!'` | Điểm unsubscribe — chỉ dùng trong subscription marbles |
| `[0-9]+ms\|s\|m` | Cú pháp nhảy thời gian: `a 10ms b` — nhảy thẳng 10ms, khỏi vẽ 10 gạch |

### Ví dụ minh họa từng trường hợp

```text
'-'          : tương đương NEVER — không bao giờ emit/complete
'|'          : tương đương EMPTY — complete ngay
'#'          : tương đương throwError — error ngay
'--a--'      : frame 2 emit 'a', rồi không bao giờ complete
'--a--b--|'  : frame 2 emit a, frame 5 emit b, frame 8 complete
'--a--b--#'  : frame 2 emit a, frame 5 emit b, frame 8 error
'-a-^-b--|'  : (hot) trước ^ là "quá khứ" — a ở frame -2; b ở frame 2, complete frame 5
'--(abc)-|'  : frame 2 emit a, b, c cùng lúc, complete frame 8
'-----(a|)'  : frame 5 emit a rồi complete ngay
'a 9ms b 9s c|' : frame 0 emit a, frame 10 emit b, frame 9011 emit c
```

### Giá trị phức tạp: object `values`

Chữ trong marble chỉ là nhãn. Nội dung thật nằm trong object `values` (hoặc mảng):

```typescript
const expected = '400ms (a-b|)';
const values = { a: { id: 1 }, b: { id: 2 } };
expectObservable(stream$).toBe(expected, values);
```

### Grouping `()` — bẫy thời gian cần biết

`'(abc)'` emit a, b, c đồng bộ trong cùng frame, **nhưng** sau đó thời gian vẫn trôi thêm số frame bằng số ký tự trong nhóm (ở đây 5, kể cả hai dấu ngoặc). Đây là điểm được ghi rõ trong tài liệu chính thức như một "known pain point" — khi sai lệch thời gian khó hiểu, hãy kiểm tra các group `()`.

### Bẫy thường gặp (đã kiểm chứng bằng chạy thật với rxjs 7.8.2)

1. **Khoảng trắng không trôi thời gian.** `' '` chỉ để căn thẳng — frame không nhảy. Muốn subscribe ở frame 3, viết `'---^'` chứ đừng viết `'   ^'` (chuỗi sau sẽ subscribe ở frame 0!).
2. **Một chuỗi subscription marble chỉ chứa được một cặp `^ !`.** Muốn assert nhiều lần subscribe (retry, share...), truyền **mảng chuỗi**: `expectSubscriptions(source.subscriptions).toBe(['^!', '-^!'])`.
3. **Tạo TestScheduler mới cho mỗi test.** Tái dùng một instance qua nhiều `run()` sẽ để virtual time của test trước "rò rỉ" sang test sau (mọi frame bị dịch đi một đoạn bằng độ dài test trước) — lỗi cực khó truy vết.
4. **Nhãn trong `cold()`/`hot()` là chữ, không phải giá trị.** `cold('-a-#')` emit chuỗi `'a'` — nếu muốn emit số `1`, phải truyền `values`: `cold('-a-#', { a: 1 })`.

---

## 5. Virtual time — test `debounceTime` thật sự

```typescript
import { TestScheduler } from 'rxjs/testing';
import { debounceTime, map } from 'rxjs';

const testScheduler = new TestScheduler((actual, expected) =>
  expect(actual).toEqual(expected)
);

it('debounceTime chỉ giữ giá trị cuối cùng', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c----|');
    const expected =    '--------c-|'; // a, b bị bỏ qua vì quá gần nhau

    expectObservable(source.pipe(debounceTime(3))).toBe(expected);
  });
});

it('lấy duration từ marble bằng time()', () => {
  testScheduler.run(({ cold, time, expectObservable }) => {
    const source = cold('-a--b--c---|');
    const t = time('     ---|'); // t = 3 frame = 3ms
    const expected =    '-a-----c---|';

    expectObservable(source.pipe(throttleTime(t))).toBe(expected);
  });
});
```

Điểm mấu chốt: `time('---|')` đo duration bằng **vị trí của ký tự `|`** — nhờ đó tham số của `throttleTime`/`delay`/`debounceTime` đồng bộ với cùng một thước thời gian, không phải đoán số millisecond.

---

## 6. Test error và retry

`#` đánh dấu lỗi; bạn có thể chỉ định lỗi gì qua tham số thứ ba của `cold()`.

```typescript
import { TestScheduler } from 'rxjs/testing';
import { retry, catchError, of } from 'rxjs';

it('retry(2): thử lại tối đa 2 lần rồi mới bắn lỗi ra ngoài', () => {
  testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
    // Stream lỗi ngay lập tức mỗi lần subscribe (error tại frame 1)
    const source = cold<never>('-#');
    // Mỗi lần retry = MỘT subscription log mới.
    // Nhiều cặp ^ ! phải khai báo bằng MẢNG — một chuỗi đơn chỉ chứa được một cặp.
    const subs = ['^!', '-^!', '--^!']; // [0,1], [1,2], [2,3]
    const expected =           '---#';  // lỗi cuối cùng ra ngoài tại frame 3

    expectObservable(source.pipe(retry(2))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

it('catchError thay lỗi bằng fallback value', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold<number>('-a-b-#', { a: 1, b: 2 });
    const expected =            '-a-b-(v|)'; // lỗi → phát fallback rồi complete
    const values = { a: 1, b: 2, v: 'fallback' };

    expectObservable(
      source.pipe(catchError(() => of('fallback')))
    ).toBe(expected, values);
  });
});

it('error message cụ thể', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const boom = new Error('network down');
    const source = cold<never>('-#', undefined, boom);

    expectObservable(source).toBe('-#', undefined, boom);
  });
});
```

Đọc `subs = ['^!', '-^!', '--^!']`: mỗi lần `retry` resubscribe đều tạo **một log subscription mới** (đúng như hành vi thật của `retry`) — đây là cách chứng minh `retry` = resubscribe từ đầu, không phải "khôi phục giữa chừng".

> Lưu ý: `retryWhen` đã **bị đánh dấu deprecated** từ RxJS 7.2 — thay thế chính thức là `retry({ delay: (error, retryCount) => ... })`. Đừng viết test mới cho `retryWhen`.

---

## 7. `expectSubscriptions` và hủy giữa chừng

```typescript
it('hot source: subscriber nào vào muộn chỉ nhận giá trị sau khi vào', () => {
  testScheduler.run(({ hot, expectObservable }) => {
    // a nằm tại các frame 2, 5, 8, 11, 14, 17, 20
    const source = hot('--a--a--a--a--a--a--a--');
    const sub1 =       '---^-------!';   // subscribe frame 3, out frame 10
    const expect1 =    '-----a--a--';       // chỉ thấy a@5 và a@8

    expectObservable(source, sub1).toBe(expect1);
  });
});

it('tự unsubscribe khỏi stream không bao giờ complete', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const forever$ = interval(1);
    const unsub = '------!'; // cắt tại frame 6

    expectObservable(forever$, unsub).toBe('-aaaaa');
  });
});
```

Kết hợp với side effect (`tap`) — dùng `flush()` để chạy xong virtual time rồi mới assert đồng bộ:

```typescript
it('tap cập nhật biến ngoài — assert sau khi flush', () => {
  testScheduler.run(({ cold, expectObservable, flush }) => {
    let eventCount = 0;
    const result = cold('--a--b|').pipe(tap(() => eventCount++));

    expectObservable(result).toBe('--a--b|');
    flush();          // chạy hết virtual time NGAY LÚC NÀY
    expect(eventCount).toBe(2); // giờ assert đồng bộ được
  });
});
```

---

## 8. So sánh TestScheduler với Jest fake timers

| Tiêu chí | TestScheduler | Jest `jest.useFakeTimers()` |
| --- | --- | --- |
| Cơ chế | Thay thế `AsyncScheduler` của RxJS bằng scheduler ảo | Thay thế `setTimeout`/`setInterval`/`Date` toàn cục |
| Điều khiển thời gian | Bằng chuỗi marble, trực quan, một dòng là một kịch bản | `advanceTimersByTime(ms)` từng bước thủ công |
| Giới hạn | Chỉ ảo hóa được operator dùng RxJS scheduler; **Promise không ảo hóa được** | Ảo hóa được mọi thứ đi qua timer, kể cả `Promise` ở cấp app? Không — Promise vẫn là microtask thật |
| Assert kết quả | `expectObservable(...).toBe('...')` — cả timeline trong 1 dòng | Assert thủ công sau mỗi bước advance |
| Khuyến nghị | Mặc định cho code RxJS thuần | Khi code trộn Promise/timer hệ thống ngoài RxJS |

Quy tắc chọn (dẫn theo "Known issues" của tài liệu chính thức):

1. Operator RxJS (`debounceTime`, `delay`, `mergeMap` của interval...) → **TestScheduler**.
2. Code tiêu thụ Promise (`from(fetch(...))`, `from(axios.get(...))`) → TestScheduler sẽ không ảo hóa được; test theo cách async thông thường (`await` + `vi.waitFor`/`await jest.advanceTimersByTimeAsync`) hoặc mock tầng Promise.
3. `delay(0)` không assert được "bằng 0 frame" — nó schedule một macrotask, không phải khoảng thời gian.

---

## 9. Ví dụ chạy được

File `src/test-scheduler-demo.ts` trong thư mục này là một test hoàn chỉnh tự chạy được mà không cần Jest — nó tự assert bằng lệnh so sánh và in kết quả ra console. Chạy:

```bash
cd 3_deep_dives/5_testing
npm install
npx ts-node src/test-scheduler-demo.ts
```

File đó bao gồm: test `debounceTime`, test `retry` kèm `expectSubscriptions`, test `catchError`, test hot observable với `^`.

---

## Tóm tắt

- `TestScheduler` = thời gian ảo; test async chạy đồng bộ, tức thì, không flaky.
- `cold()`/`hot()` tạo mock; `^` chỉ có nghĩa với hot và subscription marbles.
- `#` = error, `|` = complete, `()` = nhóm đồng bộ, `10ms` = nhảy thời gian.
- Test error/retry bằng cách so timeline `subscriptions` (`^...!`) — chứng minh hành vi resubscribe thật.
- Promise nằm ngoài phạm vi ảo hóa — tách nó ra và test riêng.
