import { describe, expect, it } from "vitest";

import {
  inspectHomePage,
  inspectStockDetailPage,
  normalizeBaseUrl,
  parseArgs,
  runSmoke,
} from "./check-hosted-evidence-smoke.mjs";

const homeHtml = `
  <main>
    <h1>StockBrief</h1>
    <p>오늘의 추천 후보</p>
    <a>추천 후보 보기</a>
  </main>
`;

const detailHtml = `
  <main>
    <h1>삼성전자</h1>
    <div>추천 후보 점수</div>
    <section>
      <h2>공시·뉴스·재무·가격 근거</h2>
      <span>근거 ID: ev_1</span>
      <span>발행일: 2026.06.26</span>
      <a href="https://provider.example/news/private-body">원문 보기</a>
      <p>provider raw title should not be printed</p>
    </section>
  </main>
`;

describe("check-hosted-evidence-smoke", () => {
  it("parses CLI args and normalizes hosted URLs", () => {
    expect(
      parseArgs([
        "--",
        "--hosted-url",
        "https://main.example.amplifyapp.com/",
        "--ticker",
        "005930",
        "--timeout-ms",
        "5000",
      ]),
    ).toMatchObject({
      hostedUrl: "https://main.example.amplifyapp.com/",
      ticker: "005930",
      timeoutMs: 5000,
    });
    expect(normalizeBaseUrl("https://main.example.amplifyapp.com/")).toBe(
      "https://main.example.amplifyapp.com",
    );
  });

  it("checks hosted home and stock detail evidence without printing raw HTML", async () => {
    const calls = [];
    const result = await runSmoke({
      hostedUrl: "https://main.example.amplifyapp.com",
      ticker: "005930",
      fetcher: async (url) => {
        calls.push(url);
        return {
          statusCode: 200,
          body: url.endsWith("/stocks/005930") ? detailHtml : homeHtml,
          errorCode: null,
        };
      },
    });

    const serialized = JSON.stringify(result);
    expect(result.ok).toBe(true);
    expect(calls).toEqual([
      "https://main.example.amplifyapp.com/",
      "https://main.example.amplifyapp.com/stocks/005930",
    ]);
    expect(result.checks["hosted_page:/stocks/{ticker}"].summary).toMatchObject({
      hasEvidenceSection: true,
      hasEvidenceId: true,
      hasPublishedDate: true,
      hasSourceReference: true,
      missing: [],
    });
    expect(serialized).not.toContain("provider raw title");
    expect(serialized).not.toContain("provider.example");
  });

  it("reports missing evidence fields as blockers", async () => {
    const result = await runSmoke({
      hostedUrl: "https://main.example.amplifyapp.com",
      ticker: "005930",
      fetcher: async (url) => ({
        statusCode: 200,
        body: url.endsWith("/stocks/005930")
          ? "<main><div>추천 후보 점수</div><h2>공시·뉴스·재무·가격 근거</h2></main>"
          : homeHtml,
        errorCode: null,
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual([
      {
        check: "hosted_page:/stocks/{ticker}",
        status_code: 200,
        missing: ["hasEvidenceId", "hasPublishedDate", "hasSourceReference"],
        error_code: "check_failed",
      },
    ]);
  });

  it("keeps page inspection rules small and explicit", () => {
    expect(inspectHomePage(homeHtml).passed).toBe(true);
    expect(inspectStockDetailPage(detailHtml).passed).toBe(true);
    expect(inspectStockDetailPage("<main>공시·뉴스·재무·가격 근거</main>").summary.missing).toContain(
      "hasEvidenceId",
    );
  });
});
