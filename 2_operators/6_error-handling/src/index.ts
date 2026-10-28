import { defer, iif, of, throwError } from "rxjs"
import { catchError, defaultIfEmpty, delay, map, retry, take, throwIfEmpty } from "rxjs/operators"

const observer = {
    next: (data: any) => console.log(data),
    error: (error: any) => console.error(error),
    complete: () => console.log('Completed!')
}
const handleError = (err: any) => {
  console.log(`Handle error running...`); // log/alert message,...
  
}

// throwError(`I'm an error`).subscribe(observer)

/** catchError - biến error thành một value thông thường để có thể completed */
// throwError(`I'm an error`)
// .pipe(
//   catchError((err: any, caught: any) => {
//     // console.log(err); // I'm an error
//     handleError(err)
//     return of('Default error'); // phải return về 1 observable - 
//   })
// )
// .subscribe(observer) // Default error

/** catchError - biến error thành một error để observer có thể đọc được */
// throwError(`I'm an error`)
// .pipe(
//   catchError((err: any, caught: any) => {
//     handleError(err)
//     const beautifullyError = new Error('Beautifully Error')
//     return throwError(beautifullyError); // giá trị sẽ về error của observer
//   })
// )
// .subscribe(observer) // Default error

/** retry cách 1 */
// const cached = [4];
// of(1, 2, 3, 4, 5)
//   .pipe(
//     map(n => {
//       if (cached.includes(n)) {
//         throw new Error("Duplicated: " + n);
//       }
//       return n;
//     }),
//     catchError((err: any, caught: any) => caught),
//     take(10)
//   )
//   .subscribe(observer);


/** retry cách 1 */
// const cached = [4];
// of(1, 2, 3, 4, 5)
//   .pipe(
//     map(n => {
//       if (cached.includes(n)) {
//         throw new Error("Duplicated: " + n);
//       }
//       return n;
//     }),
//     retry(2)
//   )
//   .subscribe(observer);

/**
 * Lần 1: 1 2 3 (không tính)
 * Lần 2 (retry lần 1): 1 2 3
 * Lần 3 (retry lần 2): 1 2 3
 */

/** defaultIfEmpty - nếu empty thì trả về giá trị mặc định*/
// of(1,2,3)
// of()
// .pipe(
//   delay(1500),
//   defaultIfEmpty('Default value if observable empty')
// )
// .subscribe(observer)


/** throwIfEmpty - nếu empty thì throw error */
// of()
// .pipe(
//   delay(1500),
//   throwIfEmpty(() => 'Throw empty')
// )
// .subscribe(observer)

/** iif */
const userId = true;
function trueObservable() {
  return of('True observable')
}
function falseObservable() {
  return of('False observable')
}

iif(() => userId, trueObservable() , falseObservable()).subscribe(observer)

// defer(() => {
//   return userId != null ? trueObservable() : falseObservable()
// })
// .subscribe(observer)