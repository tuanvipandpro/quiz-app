# Verification and traceability

## Setup scope

- Source baseline: `firebase/firestore.rules`, do người dùng gửi và xác nhận là rules đang publish. Hash/provenance: `firebase/rules-baseline.json`. Không có management API export hoặc deployment trong setup.
- Executable baseline suite: `tests/firestore/baseline.test.js`. Owner CRUD, checkpoint field preservation, guest/other-account denial, collection enumeration denial, descendant/unknown-path denial.
- Baseline custom-quiz denial là bằng chứng hiện chưa mở tính năng; không chứng minh quota/CRUD custom quiz đã được implement.
- `yarn sdd:validate` kiểm tra artifact structure. `yarn test:rules` kiểm tra supplied rules trên demo Emulator. Kết quả chạy thực tế được ghi ở PR; không lấy task checkbox làm bằng chứng thay test.

## Feature acceptance matrix

Tất cả dòng sau **Planned — chưa implement/verify cho cloud custom quizzes**. Các tên test dưới đây là test case cần tạo trong PR tính năng.

| ID    | Acceptance evidence planned                                                                          | Test layer                       |
| ----- | ---------------------------------------------------------------------------------------------------- | -------------------------------- |
| CQ-01 | Owner CRUD/list; deny guest/cross-account including direct SDK; reload from second signed-in context | Emulator + E2E                   |
| CQ-02 | 3 allowed slots, fourth/unknown slot denied, deletion frees slot, bank/local excluded                | Emulator + service + E2E         |
| CQ-03 | 1/100 valid, 0/101/forged count denied, invalid nested formats rejected on import/read               | Unit + Emulator                  |
| CQ-04 | Serialized-byte boundary and server rejection; preview retained                                      | Unit + service + E2E             |
| CQ-05 | Two contenders for last slot; same operation retried after unknown outcome                           | Emulator transaction integration |
| CQ-06 | Rename preserves identity/version/questions/checkpoint/draft                                         | Service + E2E                    |
| CQ-07 | Replace/delete confirmation, atomic reset/removal, bank unaffected                                   | Emulator + E2E                   |
| CQ-08 | Stale rename/replace/delete/checkpoint after slot reuse rejected                                     | Service + Emulator               |
| CQ-09 | Correct route/draft identity, all formats, checkpoint resume, unchanged exam deadline                | Unit + E2E                       |
| CQ-10 | Quota and all errors, VN/EN/light/dark/phone layouts, keyboard/focus                                 | E2E + visual review              |
| CQ-11 | Late request ignored after account switch; private failure does not break bank                       | Store unit + E2E                 |
| CQ-12 | Guest local flow retained, explicit cloud save, profile contract and bank regression                 | Baseline Emulator + E2E          |

Không dùng Admin SDK hoặc rules-disabled context cho các assertion quyền truy cập. Rules-disabled context chỉ seed fixture; assertions dùng authenticated/unauthenticated client contexts.
