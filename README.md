# FluentStage 3D — AI English Tutor & YouTube Shadowing

실시간 립싱크·표정 반응형 3D 아이돌 스타일 AI 원어민 튜터 5명(각 50개 제스처, 총 250개) + 유튜브 실전 문장 쉐도잉 + SM-2 간격 반복 복습(SRS) 웹 모듈입니다. 독립 웹 앱은 물론 기존 **Android 학습 앱(WebView / Flutter InAppWebView)** 내부 모듈로 바로 임베딩할 수 있도록 구성되어 있습니다.

## 1. 주요 기능

- **실사형 아이돌 스타일 3D AI 튜터 5명**: Amy Vance, Marcus Reid, Elena Chen, Oliver Bennett, Sofia Morales
- **총 250개 제스처 안무 (선생님별 50개)**: Greeting, Praise, Thinking, Explanation, Reaction 5개 카테고리를 WebGL GLSL 페이셜 리그(Viseme 립싱크, 눈 깜빡임, 미소, 목-어깨 분리 3D 회전) + 애니메이션 2D 폴백 스테이지로 실시간 구동
- **300상황 × 500핵심문장 3D 패턴·습관 가이드**: 일상(45)·여행(45)·업무(45)·쇼핑(45)·운전(40)·관공서(40)·은행(40) 300개 상황(각 11턴 대화) 및 500개 핵심 문장(평문·의문문·부정문·공손표현·과거형 변형 + 실시간 단어 교체 + 오늘 10문장 습관 루틴 + 능동 AI 대화)
- **이중화 AI 대화 백엔드**: 5개 Groq API 키 라운드 로빈(`openai/gpt-oss-120b`) + Gemini(`gemini-4-hydrogen` → 503/429 시 자동 재시도 및 `gemini-3.1-flash-lite` 폴백) + TTS(`gemini-3.8-flash-lite-tts` → 클라이언트 네이티브 TTS 자동 폴백)
- **유튜브 실전 문장 쉐도잉 & 발음 채점** + **SM-2 복습 카드(SRS)**

## 2. 실행 및 환경 변수

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # dist/ 프로덕션 번들 생성
```

`.env` 또는 AI Studio Secrets 패널:
- `GEMINI_API_KEY`: 서버 측 Gemini 대화 및 TTS용 API 키
- `GROQ_API_KEY_1` ~ `GROQ_API_KEY_5` (또는 `GROQ_API_KEYS`): 선택 사항 — 설정 시 5개 키를 순환 호출합니다.

## 3. Android 학습 앱 탑재(임베딩) 가이드

### A. 임베딩 전용 URL 쿼리 파라미터

호스트 안드로이드 앱의 `WebView` 또는 `InAppWebView`에서 아래 파라미터를 조합해 호출하면 상단 웹 내비게이션 바 없이 즉시 3D 튜터 또는 300·500 가이드 화면으로 진입합니다.

```text
https://<YOUR_APP_URL>/?embed=1&tutor=amy&cefr=A2&tab=guide&domain=banking&sentence=42
```

| 파라미터 | 설명 | 허용 값 |
| --- | --- | --- |
| `embed` | 상단 웹 TopBar 숨김 (네이티브 앱 바 사용 시) | `1`, `true` |
| `tutor` | 초기 3D 튜터 지정 | `amy`, `marcus`, `elena`, `oliver`, `sofia` |
| `cefr` | 초기 영어 난이도 | `A1`, `A2`, `B1`, `B2`, `C1` |
| `scenario` | 초기 롤플레이 시나리오 ID | `free_talk`, `cafe_order`, `airport_immigration` 등 300종 |
| `domain` | 300·500 가이드 도메인 필터 | `daily`, `travel`, `work`, `shopping`, `driving`, `government`, `banking` |
| `sentence` | 초기 선택 핵심 문장 번호 (`1`~`500` 또는 `S042`) | `1`~`500`, `S001`~`S500` |
| `tab` | 시작 탭 지정 | `tutor`, `guide`, `shadowing`, `srs`, `progress` |
| `apiBase` | 로컬 에셋 번들(`appassets.androidplatform.net`) 사용 시 백엔드 API 기본 URL | `https://...` |

### B. Android Kotlin `WebView` 연동 예시

```kotlin
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true
    mediaPlaybackRequiresUserGesture = false
}

// 1. Android 네이티브 브리지 등록 (웹 -> Android 이벤트 수신)
class AndroidTutorBridge(private val onEvent: (String) -> Unit) {
    @android.webkit.JavascriptInterface
    fun onTutorEvent(payloadJson: String) {
        // tutor_reply, sentence_practiced, word_book_sync, habit_progress 등 수신
        onEvent(payloadJson)
    }

    @android.webkit.JavascriptInterface
    fun startSpeechRecognition(lang: String) {
        // 네이티브 SpeechRecognizer / Sherpa-ONNX 실행 후 결과를 sendMessage로 전달
    }
}

webView.addJavascriptInterface(AndroidTutorBridge { json ->
    // 예: {"type":"word_book_sync","sentenceId":"S042","words":["appointment","verify"]}
}, "AndroidTutorBridge")

webView.loadUrl("https://<YOUR_APP_URL>/?embed=1&tutor=elena&tab=guide&domain=banking&sentence=42")
```

### C. 호스트 앱 → 3D 튜터 제어 (`window.FluentStageBridge`)

```kotlin
// 네이티브 음성 인식(STT) 결과를 3D 튜터에게 전송해 대화 이어가기
webView.evaluateJavascript("window.FluentStageBridge?.sendMessage('Can I order an iced latte?')", null)

// 선생님 / 제스처 / 레벨 / 도메인 / 핵심문장 실시간 변경
webView.evaluateJavascript("window.FluentStageBridge?.setTutor('marcus')", null)
webView.evaluateJavascript("window.FluentStageBridge?.triggerGesture('delighted_surprise')", null)
webView.evaluateJavascript("window.FluentStageBridge?.setCefrLevel('B2')", null)
webView.evaluateJavascript("window.FluentStageBridge?.setDomain('driving')", null)
webView.evaluateJavascript("window.FluentStageBridge?.setSentence('S120')", null)
webView.evaluateJavascript("window.FluentStageBridge?.triggerProactivePrompt()", null)

// 호스트 앱 커리큘럼 문장을 3D 튜터가 직접 말하고 립싱크하게 하기
webView.evaluateJavascript("window.FluentStageBridge?.speak('Great job on your pronunciation!', 'happy', 'proud_beam_smile')", null)
```

### D. Flutter `flutter_inappwebview` 연동

- `onWebViewCreated`에서 `controller.addJavaScriptHandler(handlerName: 'onTutorEvent', callback: ...)`를 등록하면 모든 대화, 교정 피드백, 발음 점수, TTS/STT 요청 이벤트가 자동으로 전달됩니다.
- 모든 백엔드 엔드포인트(`/api/*`)에 `Access-Control-Allow-Origin: *` CORS 헤더가 설정되어 있어 로컬 에셋 WebView에서도 API 호출이 정상 동작합니다.
