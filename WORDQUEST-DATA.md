# Dữ liệu WordQuest — luyện FER202

`db.json` giữ nguyên các ID và trường của `topics`, `words` và `questions` hiện có. Phiên đăng nhập của người học dùng `accounts.learnerId` để xác định hồ sơ trong `learners`. Xem tài khoản và cách thử ở [README](README.md).

Chạy `npm run server` và `npm start` trong hai terminal tại thư mục `ass`. API ở cổng 3001, React ở cổng 3000.

| Collection | Bản ghi | Ý nghĩa và liên kết |
| --- | ---: | --- |
| `topics` | 3 | Danh mục chủ đề. |
| `words` | 12 | Từ, nghĩa, phiên âm, ví dụ và trình độ. `topicId` trỏ tới `topics.id`. |
| `learners` | 6 | Hồ sơ người học; `status` là `ACTIVE` hoặc `INACTIVE`. |
| `decks` | 4 ban đầu | Bộ flashcard có tên, mô tả, chủ đề tùy chọn và trạng thái `OPEN` hoặc `CLOSED`. `wordIds` trỏ tới ngân hàng từ; `members[]` lưu thành viên; `cards[]` và `cardProgress[]` lưu thẻ và tiến độ của bộ. |
| `reviewLogs` | 112 | Một lần ôn: `learnerId`, `deckId`, `wordId`, `reviewedAt`, và kết quả `remembered` / `forgot`. |
| `learningProgress` | 42 | Tiến độ theo cặp `learnerId + wordId`, gộp các lần ôn ở mọi bộ. |
| `questions` | 6 | Ngân hàng câu hỏi; `wordId` trỏ tới từ được hỏi. |
| `quizAttempts` | 6 | Bài quiz đã nộp; liên kết người học và bộ flashcard, kèm mảng `answers` lưu nội dung và đáp án lúc nộp. Chỉ quiz bài giao có `assignmentId`. |
| `accounts` | 5 | Tài khoản demo. Vai trò là `teacher` hoặc `learner`. Tài khoản người học có `learnerId`. |
| `assignments` | 3 | Bài giao có `teacherId`, `deckId`, `questionIds`, `learnerIds`, `dueAt` và trạng thái `DRAFT`, `PUBLISHED` hoặc `CLOSED`. |

## Bài tập tương đương mẫu PE

| Trong mẫu PE | Bài tập WordQuest |
| --- | --- |
| Lớp có `subjectId` | Hiện tên chủ đề của bộ flashcard qua `deck.topicId`. |
| `classes.enrollments[]` nối tới sinh viên | Hiện tên thành viên qua `members[].learnerId`; đếm người còn tham gia và dùng PATCH để lưu mảng sau khi đổi trạng thái một thành viên. |
| Điểm danh nối lớp và sinh viên | Lọc nhật ký theo bộ, người học, ngày và kết quả; ghép thêm tên từ từ `words`. |
| Thống kê điểm danh | Tính số lượt nhớ, số lượt quên và tỷ lệ nhớ từ nhật ký; đối chiếu số lần ôn của từng từ với `learningProgress`. |

Ví dụ với `deck-1`: lấy bộ, tra tên chủ đề, hiển thị thành viên và lọc nhật ký của `learner-1`:

```http
GET /decks/deck-1
GET /topics/1
GET /learners
GET /reviewLogs
```

Lọc `reviewLogs` theo `deckId === "deck-1"` và `learnerId === "learner-1"` trong React trước khi tính thống kê.

## Quy ước khi ghi dữ liệu

- Mỗi phần tử trong `decks.cards[]` thuộc duy nhất bộ chứa nó. Thứ tự phần tử là thứ tự học mặc định. Thẻ riêng lưu `id`, `term`, `definition`. Thẻ lấy từ ngân hàng có `wordId` và có thể lưu nội dung riêng sau khi sửa. Bộ cũ chưa có `cards[]` đọc thẻ từ `wordIds` theo thứ tự cũ và dùng ID dạng `word-<wordId>` trong bộ.
- Tiến độ Flashcard lưu trong `decks.cardProgress[]` theo cặp `learnerId + cardId`, gồm `status` (`unseen`, `learning`, `known`) và `starred`. Với thẻ cũ chưa có đánh giá riêng, trạng thái ban đầu lấy từ lượt ôn từ vựng gần nhất của đúng người học và bộ. Đánh giá nhớ/quên của thẻ liên kết tiếp tục đồng bộ nhật ký và tiến độ từ vựng. Chọn **Chưa học** chỉ đổi trạng thái trong bộ.
- Xóa thẻ cập nhật mảng thẻ và tiến độ của bộ trong cùng một PATCH. Thẻ có từ được dùng bởi bài giao được bảo vệ. Xóa bộ có nhật ký từ vựng giữ một bản ghi chỉ để hiển thị tên trong lịch sử. Bài giao và kết quả quiz vẫn tham chiếu bộ đang tồn tại, nên chặn xóa bộ còn các liên kết đó.

- Các ID là chuỗi. Khi thêm bản ghi bằng POST, để JSON Server tự sinh `id`. API cũ vẫn dùng `GET /topics`, `GET /words` và `GET /words/1`. Với JSON Server beta đang cài, query thường như `?topicId=1` hiểu `1` là số. Tiếp tục lọc trong React như cách bạn đang làm.
- Từ mới cần `word`, `meaning`, `topicId` và `level` để dùng được danh sách và bộ lọc. Phiên âm, ví dụ, `imageUrl` và `audioUrl` có thể bổ sung sau. Khi URL ảnh hoặc âm thanh rỗng, bỏ qua phần hiển thị tương ứng.
- Chỉ ghi đánh giá hoặc dấu sao khi bộ đang mở, người học đang hoạt động, còn tham gia bộ và thẻ vẫn nằm trong bộ. Giữ nhật ký từ vựng cũ khi đóng bộ hoặc thành viên rời đi.
- Một cặp người học và từ có tối đa một bản ghi tiến độ. Sau khi ghi nhật ký, ứng dụng tính lại số lượt và trạng thái từ nhật ký của cặp đó, rồi POST tiến độ nếu chưa có hoặc PATCH nếu đã có. `lastReviewedAt` là thời điểm lượt mới nhất. Lượt mới nhất `remembered` tương ứng `mastered`, còn `forgot` tương ứng `learning`. `isFavorite` có thể được bật trước lần ôn đầu tiên.
- Mỗi cặp `assignmentId + learnerId` có tối đa một lượt nộp bài. Sau lượt nộp đầu tiên, bài giao giữ nguyên bộ flashcard, câu hỏi và người nhận để bảo toàn kết quả.
- Tính tỷ lệ nhớ bằng số lượt `remembered` chia tổng lượt trong phạm vi lọc; nếu không có lượt, hiển thị 0%. Tỷ lệ này khác với phần trăm số **từ** đã thuộc.
- Lấy câu hỏi của một bộ bằng cách lọc `questions` theo `deck.wordIds`. Khi chấm bài, so sánh `selectedAnswer === correctAnswer` trên các đáp án đã lưu. `quizAttempts.topicId` giữ lại để lọc theo chủ đề và phải khớp với bộ.
- JSON Server không kiểm tra khóa ngoại, tính tiến độ tự động hay xóa dây chuyền. Với bài tập CRUD, chặn xóa từ đang được dùng trong bộ, câu hỏi, nhật ký hoặc tiến độ để tránh liên kết bị đứt.
