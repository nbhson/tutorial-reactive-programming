/**
 * test-scheduler-demo.ts — Ví dụ TestScheduler chạy được KHÔNG cần Jest/Vitest.
 *
 * Chạy:
 *   npx ts-node src/test-scheduler-demo.ts
 *
 * Cấu trúc tương tự khi dùng với Jest:
 *   - Hàm `assert` thay cho `expect(actual).toEqual(expected)` của Jest.
 *   - Mỗi `it(...)` là một test case; chỉ khác Jest ở chỗ ta tự gọi từng hàm.
 *
 * Lưu ý quan trọng: tạo MỘT TestScheduler mới cho mỗi test.
 * Tái dùng một instance qua nhiều run() sẽ làm virtual time của test trước
 * "rò rỉ" sang test sau (frame bị dịch đi) — lỗi rất khó phát hiện.
 *
 * Nguồn chuẩn cú pháp: https://rxjs.dev/guide/testing (RxJS 7.8)
 */
import { TestScheduler } from 'rxjs/testing';
import {
  catchError,
  debounceTime,
  of,
  retry,
  throttleTime,
} from 'rxjs';

/* ------------------------------------------------------------------ */
/* Mini assert framework (thay thế Jest)                               */
/* ------------------------------------------------------------------ */

function assert(actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`Assertion failed.\n  actual:   ${a}\n  expected: ${e}`);
  }
}

/** TestScheduler yêu cầu một hàm so sánh deep-equal.
 *  Với Jest bạn viết: expect(actual).toEqual(expected); */
function createTestScheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    assert(actual, expected);
  });
}

function it(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ PASS  ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL  ${name}`);
    console.error(String(err instanceof Error ? err.message : err));
    process.exitCode = 1;
  }
}

/* ------------------------------------------------------------------ */
/* 1. debounceTime — virtual time, chạy tức thì                        */
/* ------------------------------------------------------------------ */

function testDebounceTime(): void {
  const testScheduler = createTestScheduler();

  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c----|');
    const expected =    '--------c-|'; // a, b quá gần nhau → bị bỏ qua

    expectObservable(source.pipe(debounceTime(3))).toBe(expected);
  });
}

/* ------------------------------------------------------------------ */
/* 2. throttleTime — dùng time() để lấy duration từ marble             */
/* ------------------------------------------------------------------ */

function testThrottleTime(): void {
  const testScheduler = createTestScheduler();

  testScheduler.run(({ cold, time, expectObservable }) => {
    const source = cold('-a--b--c---|');
    const t = time('     ---|'); // t = 3 frame = 3ms
    const expected =    '-a-----c---|'; // b bị throttle bỏ qua

    expectObservable(source.pipe(throttleTime(t))).toBe(expected);
  });
}

/* ------------------------------------------------------------------ */
/* 3. retry(2) — chứng minh retry = resubscribe bằng expectSubscriptions */
/* ------------------------------------------------------------------ */

function testRetry(): void {
  const testScheduler = createTestScheduler();

  testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
    // Stream lỗi ngay mỗi lần subscribe (error tại frame 1)
    const source = cold<never>('-#');

    // Mỗi lần retry = MỘT subscription log mới.
    // Nhiều lần subscribe phải khai báo bằng MẢNG chuỗi marble
    // (một chuỗi đơn chỉ được phép có một cặp ^ !).
    const subs = ['^!', '-^!', '--^!']; // [0,1], [1,2], [2,3]
    const expected = '---#'; // lỗi cuối cùng ra ngoài tại frame 3

    expectObservable(source.pipe(retry(2))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
}

/* ------------------------------------------------------------------ */
/* 4. catchError — lỗi thay bằng fallback                              */
/* ------------------------------------------------------------------ */

function testCatchError(): void {
  const testScheduler = createTestScheduler();

  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold<number>('-a-b-#', { a: 1, b: 2 });
    const expected =            '-a-b-(v|)'; // lỗi → phát fallback rồi complete
    const values = { a: 1, b: 2, v: 'fallback' };

    expectObservable(source.pipe(catchError(() => of('fallback'))))
      .toBe(expected, values);
  });
}

/* ------------------------------------------------------------------ */
/* 5. Hot observable — subscriber vào muộn chỉ thấy phần sau ^         */
/* ------------------------------------------------------------------ */

function testHotSubscriptionPoint(): void {
  const testScheduler = createTestScheduler();

  testScheduler.run(({ hot, expectObservable }) => {
    const source = hot('--a--a--a--a--a--a--a--'); // a tại các frame 2, 5, 8, 11...
    const sub1 =       '---^-------!';            // subscribe frame 3, out frame 10
    const expect1 =    '-----a--a--';              // chỉ thấy giá trị SAU khi vào (frame 5, 8)

    expectObservable(source, sub1).toBe(expect1);
  });
}

/* ------------------------------------------------------------------ */
/* Chạy tất cả                                                         */
/* ------------------------------------------------------------------ */

console.log('TestScheduler demo (virtual time — chạy tức thì):\n');

const tests: Array<[string, () => void]> = [
  ['debounceTime(3) chỉ giữ giá trị cuối cùng', testDebounceTime],
  ['throttleTime với time() lấy duration từ marble', testThrottleTime],
  ['retry(2) resubscribe đúng 3 lần rồi bắn lỗi', testRetry],
  ['catchError trả về fallback rồi complete', testCatchError],
  ['hot source: vào muộn thì bỏ qua giá trị trước ^', testHotSubscriptionPoint],
];

for (const [name, fn] of tests) {
  it(name, fn);
}

console.log('\n5 test đã chạy hoàn toàn đồng bộ — không chờ setTimeout nào cả.');
