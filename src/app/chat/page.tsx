import { Suspense } from "react";

import { ChatClient } from "@/components/ChatClient";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <section className="border-b border-line pb-6">
        <p className="text-sm font-semibold text-accent">AI 설명</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">근거 기반 설명</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          종목 코드를 입력하면 저장된 점수, 추천 이유, 근거 데이터를 바탕으로 설명을 확인합니다.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="py-6">
            <div className="border-y border-line py-6 text-sm text-muted">설명 패널을 준비하는 중입니다.</div>
          </div>
        }
      >
        <ChatClient />
      </Suspense>
    </div>
  );
}
