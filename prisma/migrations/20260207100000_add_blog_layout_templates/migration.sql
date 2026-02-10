-- CreateTable
CREATE TABLE "blog_layout_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "promptInstruction" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "previewSample" TEXT,
    "previewGeneratedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_layout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_layout_templates_userId_isActive_idx" ON "blog_layout_templates"("userId", "isActive");

-- CreateIndex
CREATE INDEX "blog_layout_templates_isPublic_isActive_idx" ON "blog_layout_templates"("isPublic", "isActive");

-- AddForeignKey
ALTER TABLE "blog_layout_templates" ADD CONSTRAINT "blog_layout_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed system layout templates
INSERT INTO "blog_layout_templates" ("id", "name", "description", "promptInstruction", "isSystem", "isPublic", "isActive", "sortOrder", "version", "updatedAt")
VALUES
  (
    'system-naver-blog-style',
    '네이버 블로그 스타일',
    '친근하고 공감 가능한 톤으로 3개 소제목 구성. 도입-전개-마무리의 자연스러운 흐름.',
    '글은 다음 흐름으로 자연스럽게 전개하세요:

첫 문단에서 독자의 공감을 끌어내는 흥미로운 이야기나 질문으로 시작합니다. 개인적인 경험이나 최근 트렌드를 언급하며 독자의 관심을 끌어주세요.

이어서 3개의 핵심 소제목(##)으로 깊이 있게 내용을 전개합니다. 각 소제목은 반드시 구체적이고 자연스러운 제목을 사용하세요. 절대로 ''본문1'', ''첫 번째 파트'', ''두 번째'' 등 순서를 나타내는 표현을 소제목에 쓰지 마세요. 각 섹션은 실질적인 정보, 예시, 개인적 의견을 균형 있게 담아주세요.

마지막에 핵심을 간결히 정리하고 독자에게 구체적인 행동을 제안하며 마무리합니다. ''결론'' 같은 소제목 없이 자연스럽게 끝내세요.

전체 톤은 친근하고 공감 가능하게 유지합니다.',
    true,
    true,
    true,
    1,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    'system-info-delivery-style',
    '정보 전달 스타일',
    '핵심 요약 불릿으로 시작, 체계적 소제목으로 상세 전개하는 정보 중심 구성.',
    '글 최상단에 3개의 불릿 포인트(- )로 핵심 내용을 요약합니다. ''3줄 요약'', ''핵심 포인트'' 같은 제목 없이 바로 불릿만 배치하세요. 각 불릿은 한 문장으로 해당 글의 가장 중요한 정보를 전달합니다.

불릿 바로 다음 문단에서 주제를 도입합니다. 왜 이 주제가 중요한지, 독자가 왜 알아야 하는지를 간결하게 설명하세요.

이어서 충분한 수의 소제목(##)으로 상세 정보를 체계적으로 전개합니다. 각 소제목은 독립적이고 설명적인 제목을 사용하세요. 필요에 따라 4~6개까지 자유롭게 늘려도 좋습니다. 각 섹션에는 구체적인 데이터, 비교, 사례를 포함하세요.

마지막 문단에서 간결하게 정리합니다. ''요약'', ''서론'', ''본론'', ''결론'' 등 구조 라벨을 절대 사용하지 마세요. 모든 소제목은 내용을 반영하는 자연스러운 제목이어야 합니다.',
    true,
    true,
    true,
    2,
    1,
    CURRENT_TIMESTAMP
  );
