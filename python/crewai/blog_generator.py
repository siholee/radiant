"""
CrewAI Blog Generator - Enhanced 4-Stage AI Agent System

4단계 프로세스 + 품질 피드백 루프:
1. 오프너 AI (Opener): 주제 분석, 검색 의도 파악, 타겟 독자 페르소나, SEO 키워드 생성
2. 리서치 AI (Researcher): E-E-A-T 기반 자료 조사, 출처 수집, FAQ 질문 수집
3. 라이터 AI (Writer): 인간적 글쓰기 + SEO 최적화 콘텐츠 작성
4. 편집자 AI (Editor): 품질 검토, AI 감지 체크, 메타 디스크립션, FAQ 스키마 생성

품질 체크 루프: Editor → AI Detection Check → (실패 시 Writer 재작성) 최대 3회

Expected Input (JSON via command line argument):
{
  "prompt": "주제: ...\n톤: ...\n키워드: ...\n목표 길이: ...",
  "title": "Blog title",
  "locale": "ko" or "en",
  "tags": ["tag1", "tag2"],
  "aiAgents": {
    "opener": "openai",
    "researcher": "perplexity",
    "writer": "gemini",
    "editor": "openai"
  },
  "apiKeys": {
    "openai": "sk-...",
    "google": "...",
    "perplexity": "pplx-..."
  }
}
"""

import sys
import json
import re
from collections import Counter

# API Clients - will be initialized with user's keys
openai_client = None
google_genai = None


def init_clients(api_keys: dict):
    """Initialize AI clients with provided API keys"""
    global openai_client, google_genai
    
    # OpenAI
    if api_keys.get('openai'):
        try:
            from openai import OpenAI
            openai_client = OpenAI(api_key=api_keys['openai'])
        except ImportError:
            print("Warning: openai package not installed", file=sys.stderr)
    
    # Google Gemini
    if api_keys.get('google'):
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_keys['google'])
            google_genai = genai
        except ImportError:
            print("Warning: google-generativeai package not installed", file=sys.stderr)


def call_openai(prompt: str, system_prompt: str = "", model: str = "gpt-4o-mini") -> str:
    """Call OpenAI API"""
    if not openai_client:
        raise Exception("OpenAI client not initialized. Please add your OpenAI API key.")
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    response = openai_client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=4000,
        temperature=0.8,  # 더 창의적인 결과를 위해 온도 증가
    )
    
    return response.choices[0].message.content or ""


def call_gemini(prompt: str, system_prompt: str = "") -> str:
    """Call Google Gemini API"""
    if not google_genai:
        raise Exception("Google Gemini client not initialized. Please add your Google API key.")
    
    model = google_genai.GenerativeModel('gemini-1.5-flash')
    
    full_prompt = prompt
    if system_prompt:
        full_prompt = f"{system_prompt}\n\n{prompt}"
    
    response = model.generate_content(full_prompt)
    
    return response.text or ""


def call_perplexity(prompt: str, system_prompt: str = "", api_key: str = "") -> str:
    """Call Perplexity API (uses OpenAI-compatible API)"""
    if not api_key:
        raise Exception("Perplexity API key not provided.")
    
    from openai import OpenAI
    
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.perplexity.ai"
    )
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    response = client.chat.completions.create(
        model="llama-3.1-sonar-small-128k-online",
        messages=messages,
        max_tokens=4000,
    )
    
    return response.choices[0].message.content or ""


def call_ai(provider: str, prompt: str, system_prompt: str = "", api_keys: dict = None) -> str:
    """Unified AI call function"""
    api_keys = api_keys or {}
    
    if provider == "openai":
        return call_openai(prompt, system_prompt)
    elif provider == "gemini":
        return call_gemini(prompt, system_prompt)
    elif provider == "perplexity":
        return call_perplexity(prompt, system_prompt, api_keys.get('perplexity', ''))
    elif provider == "claude":
        return call_openai(prompt, system_prompt)
    else:
        return call_openai(prompt, system_prompt)


# ==========================================
# Self-Heuristic AI Detection
# ==========================================

def check_ai_detection(content: str) -> dict:
    """
    Self-heuristic AI detection check
    Returns score 0-100 (higher = more likely AI-generated)
    
    체크 항목:
    1. 반복 문구 패턴 (AI는 비슷한 표현 반복)
    2. 문장 시작 다양성 (AI는 유사한 시작 패턴)
    3. 수동태 비율 (AI는 수동태 과다 사용)
    4. 문장 길이 균일성 (AI는 비슷한 길이의 문장)
    5. 과도한 전환어 사용
    6. 일반화 표현 빈도
    """
    if not content or len(content) < 100:
        return {"score": 0, "issues": [], "passed": True}
    
    issues = []
    scores = []
    
    # 마크다운 제거 후 분석
    text = re.sub(r'#+ ', '', content)
    text = re.sub(r'\*\*|\*|`|```', '', text)
    
    sentences = re.split(r'[.!?。]\s*', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if len(sentences) < 5:
        return {"score": 0, "issues": [], "passed": True}
    
    # 1. 반복 문구 패턴 체크
    common_ai_phrases_ko = [
        "중요합니다", "필수적입니다", "핵심입니다",
        "이러한", "이것은", "그것은",
        "따라서", "결론적으로", "요약하자면",
        "이를 통해", "이로 인해",
        "알아보겠습니다", "살펴보겠습니다",
        "마무리하며", "정리하자면"
    ]
    
    phrase_count = sum(1 for phrase in common_ai_phrases_ko if phrase in content)
    phrase_score = min(100, phrase_count * 8)
    scores.append(phrase_score)
    if phrase_score > 40:
        issues.append(f"AI 특유의 반복 문구 과다 사용 ({phrase_count}개)")
    
    # 2. 문장 시작 다양성 체크
    sentence_starts = [s[:10] for s in sentences if len(s) >= 10]
    unique_starts = len(set(sentence_starts))
    start_diversity = unique_starts / len(sentence_starts) if sentence_starts else 1
    start_score = int((1 - start_diversity) * 100)
    scores.append(start_score)
    if start_diversity < 0.6:
        issues.append(f"문장 시작 패턴이 반복적 (다양성: {start_diversity:.1%})")
    
    # 3. 수동태 비율 체크 (한국어)
    passive_patterns = ["되었", "됩니다", "되며", "되어", "된다", "받았", "받습니다"]
    passive_count = sum(content.count(p) for p in passive_patterns)
    passive_ratio = passive_count / len(sentences)
    passive_score = min(100, int(passive_ratio * 50))
    scores.append(passive_score)
    if passive_ratio > 0.5:
        issues.append(f"수동태 과다 사용 (비율: {passive_ratio:.1%})")
    
    # 4. 문장 길이 균일성 체크
    sentence_lengths = [len(s) for s in sentences]
    if len(sentence_lengths) > 3:
        avg_len = sum(sentence_lengths) / len(sentence_lengths)
        variance = sum((l - avg_len) ** 2 for l in sentence_lengths) / len(sentence_lengths)
        std_dev = variance ** 0.5
        cv = std_dev / avg_len if avg_len > 0 else 0  # 변동계수
        uniformity_score = int((1 - min(cv, 1)) * 60)  # CV가 낮으면 균일 = AI 의심
        scores.append(uniformity_score)
        if cv < 0.3:
            issues.append(f"문장 길이가 너무 균일함 (변동계수: {cv:.2f})")
    
    # 5. 과도한 전환어 사용
    transition_words = [
        "또한", "그러나", "하지만", "따라서", "그리고", "더불어",
        "뿐만 아니라", "결과적으로", "마찬가지로", "반면에", "게다가"
    ]
    transition_count = sum(content.count(t) for t in transition_words)
    transition_ratio = transition_count / len(sentences)
    transition_score = min(100, int(transition_ratio * 40))
    scores.append(transition_score)
    if transition_ratio > 0.7:
        issues.append(f"전환어 과다 사용 (문장당 {transition_ratio:.1f}개)")
    
    # 6. 일반화 표현 빈도
    generic_phrases = [
        "많은 사람들이", "일반적으로", "대부분의 경우",
        "흔히", "보통", "대체로", "전반적으로"
    ]
    generic_count = sum(content.count(g) for g in generic_phrases)
    generic_score = min(100, generic_count * 15)
    scores.append(generic_score)
    if generic_count > 3:
        issues.append(f"일반화 표현 과다 ({generic_count}개)")
    
    # 최종 점수 계산 (가중 평균)
    final_score = int(sum(scores) / len(scores)) if scores else 0
    
    return {
        "score": final_score,
        "issues": issues,
        "passed": final_score < 50,  # 50점 미만이면 통과
        "details": {
            "phrase_score": phrase_score,
            "start_diversity_score": start_score,
            "passive_score": passive_score,
            "transition_score": transition_score,
            "generic_score": generic_score
        }
    }


def calculate_seo_score(content: str, keywords: list, title: str, meta_description: str = "") -> dict:
    """Calculate SEO optimization score"""
    scores = []
    issues = []
    
    # 1. 키워드 밀도 체크
    content_lower = content.lower()
    keyword_counts = {}
    for kw in keywords:
        count = content_lower.count(kw.lower())
        keyword_counts[kw] = count
        if count < 3:
            issues.append(f"키워드 '{kw}' 사용 부족 ({count}회)")
    
    total_kw_count = sum(keyword_counts.values())
    word_count = len(content.split())
    kw_density = (total_kw_count / word_count * 100) if word_count > 0 else 0
    density_score = min(100, int(kw_density * 20))
    scores.append(density_score)
    
    # 2. 제목에 키워드 포함 여부
    title_lower = title.lower()
    title_kw_count = sum(1 for kw in keywords if kw.lower() in title_lower)
    title_score = min(100, title_kw_count * 50)
    scores.append(title_score)
    if title_kw_count == 0:
        issues.append("제목에 키워드가 포함되지 않음")
    
    # 3. 제목 길이 (50-60자 최적)
    title_len = len(title)
    if 50 <= title_len <= 60:
        title_len_score = 100
    elif 40 <= title_len <= 70:
        title_len_score = 80
    else:
        title_len_score = 50
        issues.append(f"제목 길이 최적화 필요 ({title_len}자, 권장: 50-60자)")
    scores.append(title_len_score)
    
    # 4. 메타 디스크립션 체크
    if meta_description:
        meta_len = len(meta_description)
        if 120 <= meta_len <= 160:
            meta_score = 100
        elif 100 <= meta_len <= 170:
            meta_score = 80
        else:
            meta_score = 50
            issues.append(f"메타 디스크립션 길이 최적화 필요 ({meta_len}자, 권장: 120-160자)")
    else:
        meta_score = 0
        issues.append("메타 디스크립션 없음")
    scores.append(meta_score)
    
    # 5. 소제목(H2, H3) 사용
    h2_count = content.count('## ')
    h3_count = content.count('### ')
    heading_score = min(100, (h2_count + h3_count) * 20)
    scores.append(heading_score)
    if h2_count < 3:
        issues.append(f"소제목(H2) 부족 ({h2_count}개, 권장: 3-5개)")
    
    # 6. 콘텐츠 길이
    content_len = len(content)
    if content_len >= 2000:
        length_score = 100
    elif content_len >= 1500:
        length_score = 80
    elif content_len >= 1000:
        length_score = 60
    else:
        length_score = 40
        issues.append(f"콘텐츠 길이 부족 ({content_len}자, 권장: 1500자 이상)")
    scores.append(length_score)
    
    final_score = int(sum(scores) / len(scores)) if scores else 0
    
    return {
        "score": final_score,
        "issues": issues,
        "keyword_counts": keyword_counts
    }


def calculate_reading_time(content: str) -> int:
    """Calculate estimated reading time in minutes (Korean avg: 400 chars/min)"""
    char_count = len(re.sub(r'\s+', '', content))
    return max(1, round(char_count / 400))


def parse_prompt(prompt: str) -> dict:
    """프롬프트 문자열을 파싱하여 구조화된 데이터로 변환"""
    lines = prompt.split('\n')
    data = {}
    
    for line in lines:
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower()
            value = value.strip()
            
            if '주제' in key or 'topic' in key:
                data['topic'] = value
            elif '톤' in key or 'tone' in key:
                data['tone'] = value
            elif '키워드' in key or 'keyword' in key:
                data['keywords'] = [k.strip() for k in value.split(',') if k.strip()]
            elif '길이' in key or 'length' in key:
                try:
                    data['target_length'] = int(''.join(filter(str.isdigit, value)))
                except:
                    data['target_length'] = 1500
    
    return data


# ==========================================
# 4-Stage AI Agent System
# ==========================================

def opener_stage(topic: str, keywords: list, target_length: int, ai_provider: str, api_keys: dict) -> dict:
    """
    오프너 AI: 주제 분석, 검색 의도 파악, 타겟 독자 페르소나, SEO 키워드 생성
    개선사항: 검색 의도 분석, 타겟 독자 페르소나 추가
    """
    system_prompt = """당신은 SEO 전문가이자 콘텐츠 전략가입니다. 
주어진 주제의 검색 의도를 분석하고, 타겟 독자를 정의하며, 
리서치팀에게 조사할 내용을 지시하고, SEO 최적화를 위한 추가 키워드를 생성합니다.
실제 검색 엔진 상위 노출을 목표로 구체적이고 실용적인 분석을 제공하세요."""

    prompt = f"""주제: {topic}
기본 키워드: {', '.join(keywords)}
목표 글 길이: {target_length}자

다음 작업을 수행하세요:

1. **검색 의도 분석**: 
   - 사용자가 이 주제를 검색하는 이유는?
   - 정보형/탐색형/거래형 중 어떤 의도인가?
   - 사용자가 원하는 최종 결과물은?

2. **타겟 독자 페르소나**:
   - 이 글을 읽을 가장 핵심적인 독자층 정의
   - 그들의 지식 수준, 관심사, 고민점 파악

3. **주제 분석**: 이 주제의 핵심 포인트와 독자가 반드시 알아야 할 내용

4. **리서치 지시사항**: 리서치팀이 조사해야 할 구체적인 내용 5-7개
   - 실제 사례, 통계, 전문가 의견 등 E-E-A-T를 높일 수 있는 항목 포함
   
5. **FAQ 질문 후보**: 독자가 궁금해할 자주 묻는 질문 3-5개

6. **SEO 추가 키워드**: 롱테일 키워드 5개 (실제 검색량 있을 법한 자연스러운 표현)

JSON 형식으로 응답하세요:
{{
  "search_intent": {{
    "type": "정보형/탐색형/거래형",
    "reason": "검색 이유",
    "desired_outcome": "사용자가 원하는 결과"
  }},
  "target_audience": {{
    "persona": "타겟 독자 설명",
    "knowledge_level": "초급/중급/고급",
    "pain_points": ["고민점1", "고민점2"]
  }},
  "topic_analysis": "주제 분석 내용",
  "research_instructions": ["조사 항목 1", "조사 항목 2", ...],
  "faq_candidates": ["질문1?", "질문2?", ...],
  "additional_keywords": ["추가 키워드 1", "추가 키워드 2", ...]
}}"""

    response = call_ai(ai_provider, prompt, system_prompt, api_keys)
    
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(response[json_start:json_end])
        else:
            result = {"topic_analysis": response, "research_instructions": [], "additional_keywords": []}
    except json.JSONDecodeError:
        result = {"topic_analysis": response, "research_instructions": [], "additional_keywords": []}
    
    return {
        "status": "completed",
        "search_intent": result.get("search_intent", {}),
        "target_audience": result.get("target_audience", {}),
        "topic_analysis": result.get("topic_analysis", ""),
        "research_instructions": result.get("research_instructions", []),
        "faq_candidates": result.get("faq_candidates", []),
        "additional_keywords": result.get("additional_keywords", [])
    }


def researcher_stage(topic: str, instructions: list, faq_candidates: list, 
                     ai_provider: str, api_keys: dict) -> dict:
    """
    리서치 AI: E-E-A-T 기반 자료 조사, 출처 수집, FAQ 답변 준비
    개선사항: E-E-A-T 수집, 출처 명시, FAQ 정보 수집
    """
    system_prompt = """당신은 전문 리서치 분석가입니다. 
주어진 주제에 대해 E-E-A-T(경험, 전문성, 권위성, 신뢰성)를 높일 수 있는 깊이 있는 조사를 수행합니다.
구체적인 사실, 최신 통계, 실제 사례, 전문가 의견을 포함하세요.
가능한 경우 출처나 근거를 명시하세요."""

    instructions_text = "\n".join([f"- {inst}" for inst in instructions]) if instructions else f"- {topic}에 대한 전반적인 정보"
    faq_text = "\n".join([f"- {q}" for q in faq_candidates]) if faq_candidates else ""
    
    prompt = f"""주제: {topic}

## 조사 항목:
{instructions_text}

## 답변할 FAQ 질문:
{faq_text}

다음 형식으로 조사 결과를 제공하세요:

1. **핵심 조사 결과**: 각 조사 항목에 대한 상세 정보
   - 구체적인 수치, 통계, 사례 포함
   - 가능하면 출처나 근거 명시 (예: "OO 연구에 따르면...")

2. **E-E-A-T 요소**:
   - 경험(Experience): 실제 사용자 경험, 후기, 케이스 스터디
   - 전문성(Expertise): 전문가 의견, 업계 표준
   - 권위성(Authoritativeness): 공식 기관 정보, 인정받는 출처
   - 신뢰성(Trustworthiness): 검증 가능한 사실, 최신 정보

3. **FAQ 답변 자료**: 각 FAQ 질문에 대한 간결하고 명확한 답변

조사 결과는 블로그 글 작성에 직접 활용될 수 있도록 명확하고 구체적으로 작성하세요."""

    response = call_ai(ai_provider, prompt, system_prompt, api_keys)
    
    return {
        "status": "completed", 
        "research_data": response,
        "faq_research": faq_candidates  # FAQ 질문 전달
    }


def writer_stage(topic: str, tone: str, keywords: list, additional_keywords: list, 
                 research_data: str, target_audience: dict, search_intent: dict,
                 target_length: int, ai_provider: str, api_keys: dict,
                 revision_feedback: str = "", layout_instruction: str = None) -> dict:
    """
    라이터 AI: 인간적 글쓰기 + SEO 최적화 콘텐츠 작성
    개선사항: 인간화 가이드라인, 검색 의도 반영, 피드백 반영 재작성, 커스텀 레이아웃 지원
    """
    tone_descriptions = {
        "professional": "전문적이고 신뢰감 있는 톤으로 작성하되, 딱딱하지 않게",
        "casual": "친근하고 편안한 대화체로 작성",
        "educational": "교육적이고 설명적인 톤으로, 예시를 많이 사용",
        "conversational": "대화하듯 자연스럽게, 독자에게 말하듯이"
    }
    
    tone_instruction = tone_descriptions.get(tone, tone_descriptions["professional"])
    add_kw = additional_keywords[:3] if additional_keywords else []
    
    audience_info = ""
    if target_audience:
        audience_info = f"""
타겟 독자: {target_audience.get('persona', '일반 독자')}
지식 수준: {target_audience.get('knowledge_level', '중급')}
독자의 고민: {', '.join(target_audience.get('pain_points', []))}"""
    
    intent_info = ""
    if search_intent:
        intent_info = f"""
검색 의도: {search_intent.get('type', '정보형')}
독자가 원하는 것: {search_intent.get('desired_outcome', '정보 획득')}"""
    
    revision_instruction = ""
    if revision_feedback:
        revision_instruction = f"""

⚠️ 이전 버전에서 발견된 문제점 - 반드시 수정하세요:
{revision_feedback}

위 문제점들을 해결하여 더 자연스럽고 인간적인 글을 작성하세요."""

    system_prompt = f"""당신은 10년 경력의 전문 블로그 작가입니다. {tone_instruction}
{audience_info}
{intent_info}

## 인간적 글쓰기 가이드라인 (필수):
1. 문장 길이 다양하게: 짧은 문장과 긴 문장을 섞어 리듬감 있게
2. 1인칭/2인칭 사용: "저는", "제가", "여러분", "당신" 등 직접 대화하듯
3. 질문 던지기: 독자에게 질문을 던져 참여 유도
4. 개인 경험/의견: "제 경험상", "솔직히 말하면" 등 개인적 관점 추가
5. 구어체 표현: "사실", "근데", "아시다시피" 등 자연스러운 구어체
6. 전환어 절제: "또한", "그러나" 등 전환어 남용 금지
7. 구체적 숫자/사례: 추상적 표현 대신 구체적 예시 사용

## 구조 라벨 절대 금지 (매우 중요):
**다음과 같은 구조적 라벨을 제목, 소제목, 내용 어디에도 절대 사용하지 마세요:**
- "서론:", "본론:", "결론:", "마무리:", "인트로:", "아웃트로:"
- "본문1:", "본문2:", "본문 1:", "Body 1:"
- "첫 번째:", "두 번째:", "세 번째:"
- "## 서론", "## 본론", "## 결론", "## 마무리"
- "1. 서론", "2. 본론", "3. 결론"
모든 소제목(##)은 해당 섹션의 내용을 반영하는 구체적이고 자연스러운 제목만 사용하세요.

## SEO 최적화:
- 기본 키워드 ({', '.join(keywords)}): 각각 본문에서 자연스럽게 5회 이상 사용
- 추가 키워드 ({', '.join(add_kw)}): 각각 3회 이상 사용

## 주의사항:
- "알아보겠습니다", "살펴보겠습니다" 등 AI 특유 표현 사용 금지
- "중요합니다", "필수적입니다" 등 과도한 강조 표현 자제
- 문장 시작을 다양하게 (같은 패턴 반복 금지){revision_instruction}"""

    # Build structure instruction: use custom layout or default
    if layout_instruction:
        structure_section = f"""\n## 글 구조:\n{layout_instruction}\n\n위 구조를 따르되, 절대 '서론', '본문1', '결론' 등의 구조 라벨을 사용하지 마세요. 모든 소제목은 자연스러운 제목으로만 작성하세요."""
    else:
        structure_section = """\n## 필수 구조:\n1. **흥미로운 도입부** (200-300자)\n   - 공감을 이끌어내는 훅\n   - 글에서 다룰 내용 간략 소개\n   \n2. **핵심 내용** (3-5개의 소제목)\n   - 각 섹션 300-500자\n   - 구체적 정보, 예시, 사례 포함\n   \n3. **마무리** (100-200자)\n   - 핵심 정리\n   - 독자에게 다음 행동 제안\n\n절대 '서론:', '본문1:', '결론:' 등의 구조 라벨을 소제목에 사용하지 마세요."""

    prompt = f"""주제: {topic}
목표 글 길이: 약 {target_length}자 (소제목 제외)

조사된 자료:
{research_data}

위 자료를 바탕으로 완성도 높은 블로그 글을 작성하세요.
{structure_section}

마크다운 형식으로 작성하세요. 제목은 # , 소제목은 ## 를 사용하세요."""

    response = call_ai(ai_provider, prompt, system_prompt, api_keys)
    
    return {"status": "completed", "content": response}


def editor_stage(content: str, topic: str, keywords: list, faq_candidates: list,
                 ai_provider: str, api_keys: dict, iteration: int = 1) -> dict:
    """
    편집자 AI: 품질 검토, AI 감지 체크, 메타 디스크립션, FAQ 스키마 생성
    개선사항: 2단계 구조 라벨 검증 (정규식 + LLM)
    """
    # === 1단계: 정규식으로 구조 라벨 감지 ===
    label_patterns = [
        r'^\s*#{1,3}\s*(서론|본론|결론|마무리|인트로|아웃트로)[:\s]?$',
        r'^\s*#{1,3}\s*(본문|Body)\s*\d+',
        r'^\s*\d+[\.)\s]+(서론|본론|결론|마무리)',
        r'^(첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째)[:\s]',
        r'^\s*#{1,3}\s*\d+\s*[\.)\s]+(서론|본론|결론)',
    ]
    
    detected_labels = []
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        for pattern in label_patterns:
            if re.search(pattern, line.strip(), re.IGNORECASE):
                detected_labels.append(f"Line {i}: {line.strip()}")
                break
    
    # === 2단계: 감지된 라벨이 있으면 LLM으로 정제 ===
    label_quality_note = ""
    if detected_labels:
        try:
            cleanup_system = """당신은 편집 전문가입니다.
주어진 블로그 글에서 '서론:', '본문1:', '## 결론' 등 기계적인 구조 라벨이 소제목에 사용되었다면,
해당 소제목을 섹션 내용에 맞는 구체적이고 자연스러운 소제목으로 교체하세요.
글의 내용 자체는 절대 수정하지 마세요. 소제목만 교체합니다.
라벨이 없는 소제목은 그대로 유지하세요."""

            cleanup_prompt = f"""다음 블로그 글의 소제목 중 구조 라벨('서론', '본론', '결론', '본문1' 등)이 있으면 자연스러운 소제목으로 교체하세요.

{content}

규칙:
- '## 서론' → 도입 내용에 맞는 소제목
- '## 본론 1' → 해당 섹션 내용을 반영하는 소제목
- '## 결론' → 마무리 내용에 맞는 소제목
- 내용은 수정하지 않고 소제목만 교체
- 마크다운 형식 유지

전체 글을 반환하세요."""

            cleaned_content = call_ai(ai_provider, cleanup_prompt, cleanup_system, api_keys)
            if cleaned_content and len(cleaned_content) > len(content) * 0.5:
                content = cleaned_content
                label_quality_note = f"구조 라벨 {len(detected_labels)}개 감지 및 제거됨"
        except Exception as e:
            label_quality_note = f"구조 라벨 {len(detected_labels)}개 감지됨 (자동 제거 실패: {str(e)})"
    
    faq_instruction = ""
    if faq_candidates:
        faq_instruction = f"""
5. **FAQ 스키마**: 다음 질문들에 대한 간결한 답변 (각 100자 이내)
{chr(10).join([f'   - {q}' for q in faq_candidates])}"""

    system_prompt = """당신은 전문 편집자이자 SEO 전문가입니다.
블로그 글을 검토하고 품질을 개선하며, SEO 메타데이터를 생성합니다.
특히 AI가 작성한 것처럼 느껴지는 부분을 자연스럽게 수정하는 데 집중하세요."""

    prompt = f"""다음 블로그 글을 검토하고 개선하세요 (반복 {iteration}회차):

---
{content}
---

주제: {topic}
키워드: {', '.join(keywords)}

다음 작업을 수행하세요:

1. **글 품질 검토 및 개선**:
   - AI가 작성한 것처럼 느껴지는 부분을 자연스럽게 수정
   - 문법, 맞춤법 오류 수정
   - 표현을 더 풍부하고 인간적으로 개선
   - 반복되는 패턴 제거

2. **SEO 최적화 제목 생성**:
   - 키워드 포함
   - 클릭을 유도하는 매력적인 제목
   - 50-60자 권장

3. **메타 디스크립션** (120-160자):
   - 글의 핵심 내용 요약
   - 클릭 유도 문구 포함
   - 키워드 자연스럽게 포함

4. **해시태그 30개 생성**
{faq_instruction}

반드시 다음 JSON 형식으로만 응답하세요:
{{
  "improved_content": "개선된 전체 블로그 글 (마크다운 형식)",
  "seo_title": "SEO 최적화된 제목 (50-60자)",
  "meta_description": "메타 디스크립션 (120-160자)",
  "hashtags": ["#해시태그1", "#해시태그2", ... 총 30개],
  "faq": [
    {{"question": "질문1?", "answer": "답변1"}},
    {{"question": "질문2?", "answer": "답변2"}}
  ],
  "slug": "url-friendly-slug"
}}"""

    response = call_ai(ai_provider, prompt, system_prompt, api_keys)
    
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(response[json_start:json_end])
        else:
            result = {"improved_content": content, "seo_title": topic, "hashtags": []}
    except json.JSONDecodeError:
        result = {"improved_content": content, "seo_title": topic, "hashtags": []}
    
    hashtags = result.get("hashtags", [])
    generic_tags = ["#블로그", "#정보", "#팁", "#가이드", "#트렌드", "#인사이트", 
                   "#콘텐츠", "#지식공유", "#유용한정보", "#꿀팁", "#추천", "#리뷰",
                   "#소개", "#분석", "#전문가", "#실전", "#노하우", "#핵심정리"]
    while len(hashtags) < 30 and generic_tags:
        tag = generic_tags.pop(0)
        if tag not in hashtags:
            hashtags.append(tag)
    
    quality_issues = result.get("quality_issues", [])
    if label_quality_note:
        quality_issues.append(label_quality_note)
    
    return {
        "status": "completed",
        "improved_content": result.get("improved_content", content),
        "seo_title": result.get("seo_title", topic),
        "meta_description": result.get("meta_description", ""),
        "hashtags": hashtags[:30],
        "faq": result.get("faq", []),
        "slug": result.get("slug", ""),
        "quality_issues": quality_issues
    }


# ==========================================
# Main Generation with Feedback Loop
# ==========================================

def generate_blog_post(prompt: str, title: str = None, locale: str = "ko", 
                       tags: list = None, ai_agents: dict = None, api_keys: dict = None,
                       layout_instruction: str = None):
    """
    4단계 AI 에이전트 시스템으로 블로그 포스트 생성
    + 품질 피드백 루프 (최대 3회)
    """
    if api_keys:
        init_clients(api_keys)
    
    if not ai_agents:
        ai_agents = {"opener": "openai", "researcher": "perplexity", "writer": "gemini", "editor": "openai"}
    
    parsed = parse_prompt(prompt)
    topic = parsed.get('topic', title or 'Untitled')
    tone = parsed.get('tone', 'professional')
    keywords = parsed.get('keywords', tags or [])
    target_length = parsed.get('target_length', 1500)
    
    stages_result = {}
    quality_warning = False
    
    # 1. 오프너 AI
    opener_result = opener_stage(topic, keywords, target_length, ai_agents.get('opener', 'openai'), api_keys or {})
    stages_result['opener'] = opener_result
    
    additional_keywords = opener_result.get('additional_keywords', [])
    research_instructions = opener_result.get('research_instructions', [])
    faq_candidates = opener_result.get('faq_candidates', [])
    target_audience = opener_result.get('target_audience', {})
    search_intent = opener_result.get('search_intent', {})
    
    # 2. 리서치 AI
    researcher_result = researcher_stage(
        topic, research_instructions, faq_candidates,
        ai_agents.get('researcher', 'openai'), api_keys or {}
    )
    stages_result['researcher'] = researcher_result
    
    # 3 & 4. Writer ↔ Editor 피드백 루프 (최대 3회)
    MAX_ITERATIONS = 3
    AI_DETECTION_THRESHOLD = 50  # 50점 미만이면 통과
    
    final_content = ""
    editor_result = {}
    revision_feedback = ""
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        # 라이터 AI
        writer_result = writer_stage(
            topic, tone, keywords, additional_keywords, 
            researcher_result.get('research_data', ''),
            target_audience, search_intent,
            target_length,
            ai_agents.get('writer', 'openai'), api_keys or {},
            revision_feedback,
            layout_instruction
        )
        stages_result[f'writer_v{iteration}'] = writer_result
        
        # 편집자 AI
        editor_result = editor_stage(
            writer_result.get('content', ''), topic, keywords, faq_candidates,
            ai_agents.get('editor', 'openai'), api_keys or {},
            iteration
        )
        stages_result[f'editor_v{iteration}'] = editor_result
        
        final_content = editor_result.get('improved_content', writer_result.get('content', ''))
        
        # AI 감지 체크
        ai_check = check_ai_detection(final_content)
        stages_result[f'ai_check_v{iteration}'] = ai_check
        
        if ai_check['passed']:
            # 품질 체크 통과
            stages_result['final_iteration'] = iteration
            break
        elif iteration < MAX_ITERATIONS:
            # 피드백 생성하여 다음 반복에 전달
            revision_feedback = "\n".join([
                f"- {issue}" for issue in ai_check['issues']
            ])
            revision_feedback += "\n\nAI 감지 점수: {}점 (50점 미만 필요)".format(ai_check['score'])
        else:
            # 최대 반복 후에도 실패 - 경고 표시
            quality_warning = True
            stages_result['quality_warning_reason'] = ai_check['issues']
    
    # SEO 점수 계산
    seo_result = calculate_seo_score(
        final_content, 
        keywords, 
        editor_result.get('seo_title', title or topic),
        editor_result.get('meta_description', '')
    )
    
    # 읽기 시간 계산
    reading_time = calculate_reading_time(final_content)
    
    # AI 감지 최종 점수
    final_ai_check = check_ai_detection(final_content)
    
    final_title = editor_result.get('seo_title', title or topic)
    hashtags = editor_result.get('hashtags', [])
    
    excerpt = final_content[:300].replace('#', '').strip()
    if len(excerpt) > 200:
        excerpt = excerpt[:197] + "..."
    
    # FAQ 스키마 구성
    faq_schema = editor_result.get('faq', [])
    
    return {
        "title": final_title,
        "content": final_content,
        "excerpt": excerpt,
        "hashtags": hashtags,
        "metadata": {
            "locale": locale,
            "tags": tags or [],
            "generator": "crewai-4stage-enhanced",
            "seoKeywords": additional_keywords,
            "aiAgents": ai_agents,
            "stages": stages_result,
            
            # SEO 최적화 필드
            "metaDescription": editor_result.get('meta_description', ''),
            "faqSchema": faq_schema,
            "slug": editor_result.get('slug', ''),
            "readingTime": reading_time,
            
            # 품질 관리 필드
            "seoScore": seo_result['score'],
            "seoIssues": seo_result['issues'],
            "aiDetectionScore": final_ai_check['score'],
            "aiDetectionIssues": final_ai_check.get('issues', []),
            "qualityWarning": quality_warning,
            "iterationsUsed": stages_result.get('final_iteration', MAX_ITERATIONS)
        }
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided."}))
        sys.exit(1)
    
    try:
        input_data = json.loads(sys.argv[1])
        
        # Check for test mode
        test_mode = input_data.get("testMode", False)
        
        prompt = input_data.get("prompt")
        title = input_data.get("title")
        locale = input_data.get("locale", "ko")
        tags = input_data.get("tags", [])
        ai_agents = input_data.get("aiAgents")
        api_keys = input_data.get("apiKeys", {})
        
        # Writing style samples for test mode
        writing_samples = input_data.get("writingSamples", [])
        
        # Layout template
        layout_data = input_data.get("layout", {})
        layout_instruction = layout_data.get("instruction") if layout_data else None
        
        if not prompt:
            print(json.dumps({"error": "Prompt is required"}))
            sys.exit(1)
        
        if not api_keys:
            print(json.dumps({"error": "API keys are required. Please add your AI API keys in settings."}))
            sys.exit(1)
        
        # Test mode: Generate short sample text only
        if test_mode:
            result = generate_test_sample(prompt, locale, ai_agents, api_keys, writing_samples, layout_instruction)
        else:
            result = generate_blog_post(prompt, title, locale, tags, ai_agents, api_keys, layout_instruction)
            
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Generation failed: {str(e)}"}))
        sys.exit(1)


def generate_test_sample(prompt: str, locale: str, ai_agents: dict, api_keys: dict, writing_samples: list = None, layout_instruction: str = None) -> dict:
    """
    Generate a short test sample (200-300 characters) to preview writing style.
    Uses only the Writer AI stage for quick generation.
    
    Args:
        prompt: Topic or theme for the test
        locale: Language ('ko' or 'en')
        ai_agents: AI model configuration
        api_keys: API keys
        writing_samples: Optional list of writing samples for style reference
        layout_instruction: Optional layout template instruction
    
    Returns:
        dict with test content and metadata
    """
    # Initialize API clients
    init_clients(api_keys)
    
    # Determine which AI to use for writing
    writer_ai = ai_agents.get("writer", "openai") if ai_agents else "openai"
    
    # Build style reference from samples
    style_reference = ""
    if writing_samples and len(writing_samples) > 0:
        sample_texts = []
        for sample in writing_samples[:3]:  # Use up to 3 samples
            content = sample.get('content', '')[:500]  # Limit each sample
            if content:
                sample_texts.append(content)
        
        if sample_texts:
            style_reference = f"""
다음은 참고할 문체 샘플입니다. 이 글쓰기 스타일을 분석하고 최대한 비슷하게 작성하세요:

--- 샘플 시작 ---
{chr(10).join(sample_texts)}
--- 샘플 끝 ---

"""
    
    # System prompt for test generation
    layout_note = ""
    if layout_instruction:
        layout_note = f"\n\n## 글 구조 참고:\n{layout_instruction}\n\n위 구조의 축약 버전으로 미리보기를 작성하세요. '서론', '본문1', '결론' 등 구조 라벨은 절대 사용하지 마세요."
    
    if locale == 'ko':
        system_prompt = f"""당신은 전문 블로그 작가입니다. 주어진 주제에 대해 짧은 테스트 문단(200-300자)을 작성하세요.

규칙:
- 자연스럽고 인간적인 문체로 작성
- 마크다운 소제목(##)을 2-3개 사용하여 구조를 보여주세요
- 딱딱한 서론 없이 바로 시작
- AI가 쓴 것처럼 보이지 않게 주의
- '서론', '본론', '결론' 등 구조 라벨 절대 금지{layout_note}"""
        
        user_prompt = f"""{style_reference}주제: {prompt}

위 주제에 대해 200-300자 정도의 짧은 문단을 작성하세요. 자연스럽고 인간적인 톤으로 작성하되, 제공된 문체 샘플이 있다면 그 스타일을 최대한 반영하세요."""
    else:
        en_layout_note = ""
        if layout_instruction:
            en_layout_note = f"\n\n## Structure reference:\n{layout_instruction}\n\nWrite a condensed preview following this structure. Never use structural labels like 'Introduction:', 'Body 1:', 'Conclusion:' etc."
        
        system_prompt = f"""You are a professional blog writer. Write a short test paragraph (100-150 words) on the given topic.

Rules:
- Write in a natural, human-like style
- Use 2-3 markdown subheadings (##) to show structure
- Start directly with the content, no formal introductions
- Avoid sounding like AI-generated content
- Never use structural labels like 'Introduction', 'Body', 'Conclusion'{en_layout_note}"""
        
        user_prompt = f"""{style_reference}Topic: {prompt}

Write a short paragraph of about 100-150 words on this topic. Use a natural, human-like tone, and if writing samples are provided, reflect that style as much as possible."""
    
    try:
        # Generate content using Writer AI
        content = call_ai(writer_ai, user_prompt, system_prompt, api_keys)
        
        # Clean up the content
        content = content.strip()
        
        # Remove excessive markdown but keep subheadings for structure preview
        content = re.sub(r'\*\*|\*|`|```', '', content)
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Check AI detection on the test sample
        ai_check = check_ai_detection(content)
        
        return {
            "success": True,
            "content": content,
            "wordCount": len(content) if locale == 'ko' else len(content.split()),
            "characterCount": len(content),
            "aiModel": writer_ai,
            "locale": locale,
            "aiDetectionScore": ai_check.get('score', 0),
            "aiDetectionPassed": ai_check.get('passed', True),
            "aiDetectionIssues": ai_check.get('issues', [])
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "aiModel": writer_ai
        }


if __name__ == "__main__":
    main()
