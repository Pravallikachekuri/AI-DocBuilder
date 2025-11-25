import os
from typing import List

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables")

        # 👇 Choose a modern, supported model (1.5 & 1.0 give 404 now)
        # or "gemini-2.0-flash"
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        print(f"[GeminiClient] Initializing with model: {model_name}")
        genai.configure(api_key=api_key)
        self.model_name = model_name
        self.model = genai.GenerativeModel(model_name=model_name)

    # ---------- Internal helpers ----------

    @staticmethod
    def _normalize_doc_type(document_type: str) -> str:
        """
        Normalize document_type to 'docx' or 'pptx'.
        Handles enums, plain strings, etc.
        """
        if document_type is None:
            return "docx"

        if hasattr(document_type, "value"):
            return document_type.value

        s = str(document_type).strip().lower()
        if "ppt" in s:
            return "pptx"
        return "docx"

    @staticmethod
    def _extract_text(response) -> str:
        """Safely extract text from a Gemini response object."""
        if response is None:
            return "Error: Empty response from Gemini."

        # Normal path (for google-generativeai >= 0.7)
        if getattr(response, "text", None):
            return response.text

        # Fallback: try to dig text out of candidates/parts if shape is different
        try:
            parts = []
            for cand in getattr(response, "candidates", []) or []:
                content = getattr(cand, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", []) or []:
                    # part might be dict-like or object-like
                    text = None
                    if isinstance(part, dict):
                        text = part.get("text")
                    else:
                        text = getattr(part, "text", None)
                    if text:
                        parts.append(text)
            if parts:
                return "\n".join(parts)
        except Exception:
            pass

        return "Error: Unable to extract text from Gemini response."

    @staticmethod
    def _section_guidance(section_title: str) -> str:
        """
        Return extra instructions based on the section title.
        This helps Gemini write very specific content per section.
        Still stays flexible for unknown / custom titles.
        """
        title = (section_title or "").lower()

        if "intro" in title:
            return (
                "- Clearly introduce the topic and why it matters right now.\n"
                "- Define the scope and objectives of the document.\n"
                "- Briefly highlight 2–3 key themes that will be explored later.\n"
            )
        if "background" in title or "context" in title:
            return (
                "- Explain how this topic evolved over time and what the current situation looks like.\n"
                "- Highlight key drivers (technology, regulation, customer behavior, economics).\n"
                "- Include 1–2 realistic examples or mini-cases.\n"
            )
        if (
            "market analysis" in title
            or "industry analysis" in title
            or "market overview" in title
        ):
            return (
                "- Discuss market size direction, major segments, and key players.\n"
                "- Describe 3–5 important trends and what is driving them.\n"
                "- Use simple qualitative numbers (e.g., 'rapid growth', 'low single-digit decline') without pretending to know exact real-world statistics.\n"
            )
        if "key findings" in title or "findings" in title or "insights" in title:
            return (
                "- Summarize the most important insights discovered in the analysis.\n"
                "- Group findings into 3–6 clear bullets or mini-paragraphs.\n"
                "- For each finding, briefly explain why it matters for decisions.\n"
            )
        if "recommendation" in title or "strategy" in title or "strategic" in title:
            return (
                "- Provide 3–6 specific, actionable recommendations.\n"
                "- For each one, explain the rationale and expected impact.\n"
                "- Distinguish between quick wins and longer-term strategic moves.\n"
            )
        if "conclusion" in title or "summary" in title:
            return (
                "- Synthesize the overall story: what we learned and what it implies.\n"
                "- Re-emphasize 2–4 crucial insights and link them to the recommendations.\n"
                "- End with a forward-looking view: risks, opportunities, or next steps.\n"
            )
        if "agenda" in title:
            return (
                "- Provide a logical sequence of 5–8 items that will be covered.\n"
                "- Each bullet should correspond to a major topic or section.\n"
            )
        if "problem" in title or "challenge" in title or "pain point" in title:
            return (
                "- Clearly define the core problem(s) from the business or user perspective.\n"
                "- Explain root causes and how the problem appears in reality.\n"
                "- Make clear what happens if the problem is not solved.\n"
            )
        if "solution" in title or "proposal" in title:
            return (
                "- Describe the proposed solution: what it is, how it works, and why it fits.\n"
                "- Highlight 2–4 key features or components and their benefits.\n"
                "- Briefly mention trade-offs or prerequisites if relevant.\n"
            )
        if (
            "next steps" in title
            or "roadmap" in title
            or "implementation" in title
            or "plan" in title
        ):
            return (
                "- Provide 4–8 concrete next steps or phases.\n"
                "- Indicate logical order and rough timing where useful.\n"
                "- Focus on actions, owners, and outcomes.\n"
            )
        if "risk" in title or "mitigation" in title:
            return (
                "- Identify 3–6 key risks (strategic, financial, operational, regulatory, etc.).\n"
                "- For each risk, estimate likelihood/impact qualitatively (high/medium/low).\n"
                "- Propose concise mitigation or monitoring actions.\n"
            )
        if "financial" in title or "economics" in title or "business case" in title:
            return (
                "- Discuss revenue drivers, cost drivers, and overall value creation.\n"
                "- Use simple scenario language (optimistic / base / conservative).\n"
                "- Explain how the economics connect back to the strategy.\n"
            )

        # Default guidance for ANY custom / unknown section
        return (
            "- Make this section add unique value and avoid repeating other sections.\n"
            "- Focus on the most important 3–7 ideas for this heading.\n"
            "- Use concrete examples or simple scenarios to make it easy to understand.\n"
            "- Whenever possible, turn vague statements into specific, practical insights.\n"
        )

    # ---------- Public methods ----------

    def generate_content(self, prompt: str) -> str:
        """Send a text prompt to Gemini and return plain text."""
        try:
            response = self.model.generate_content(prompt)
            return self._extract_text(response)
        except Exception as e:
            print(f"[GeminiClient] Error generating content: {e}")
            return f"Error generating content from Gemini: {str(e)}"

    def generate_section_content(
        self, topic: str, section_title: str, document_type: str
    ) -> str:
        """
        Generate content for a specific section of a document, tailored to
        the section type and docx/pptx format.
        Works for ANY topic and ANY section title.
        """
        doc_type = self._normalize_doc_type(document_type)
        doc_desc = "Word report" if doc_type == "docx" else "slide deck"
        guidance = self._section_guidance(section_title)

        prompt = f"""
You are an expert business analyst and technical writer.

Write content for the section "{section_title}" in a {doc_desc} about "{topic}".

Section-specific guidance:
{guidance}
General requirements:
- Tone: professional, clear, and insightful.
- Make it tightly connected to the given topic (no generic business filler).
- Prefer depth over buzzwords: explain the *why* behind the points you make.
- Use simple numbers, ranges, or qualitative terms (e.g., "rapid growth", "moderate decline") when helpful, but do not invent precise real-world statistics.
- Where relevant, include 1–2 short examples, mini-cases, or scenarios to make ideas concrete.

Formatting:
- For Word documents (docx): write 2–4 well-structured paragraphs. You may use short subheadings or bullet lists when they genuinely help readability.
- For PowerPoint (pptx): return 3–7 concise bullet points suitable for slides (no long paragraphs).
- Avoid meta commentary like "this section will discuss..." — just provide the content itself.
- Do not include markdown fences or quotes around the entire answer.

Return only the section content.
"""
        return self.generate_content(prompt)

    def refine_content(self, current_content: str, user_prompt: str) -> str:
        """Refine existing content according to user instructions."""
        prompt = f"""
You are a skilled editor and writing assistant.

Refine the following content according to this instruction:

User instruction: "{user_prompt}"

Original content:
\"\"\"{current_content}\"\"\"


Requirements:
- Preserve the important facts and meaning from the original text.
- Apply the user instruction carefully (tone, length, clarity, format, etc.).
- Improve structure, remove redundancy, and make the result easy to skim.
- Return only the revised content, with no explanation or commentary.
"""
        return self.generate_content(prompt)

    def generate_outline(self, topic: str, document_type: str) -> List[str]:
        """Generate an outline (section or slide titles) for the given topic."""
        doc_type = self._normalize_doc_type(document_type)

        if doc_type == "docx":
            prompt = f"""
Generate a comprehensive outline for a professional Word report about "{topic}".

Requirements:
- Provide 5–8 section titles.
- Titles should be specific and informative (avoid single words like "Overview").
- Cover a logical flow: introduction, context, analysis, insights, recommendations, conclusion (adapted to the topic).
- Return ONLY the section titles, one per line.
- Do not include numbering, bullets, or any extra commentary.
"""
        else:
            prompt = f"""
Generate a slide deck outline for a professional PowerPoint presentation about "{topic}".

Requirements:
- Provide 8–12 slide titles.
- Include a natural story flow: title, agenda, problem, analysis, insights, recommendations, implementation/next steps, etc., adapted to this topic.
- Return ONLY the slide titles, one per line.
- Do not include numbering, bullets, or any extra commentary.
"""

        try:
            raw = self.generate_content(prompt)
            lines = [line.strip() for line in raw.split("\n") if line.strip()]

            cleaned_titles: List[str] = []
            for title in lines:
                # Strip bullets and numbering if Gemini adds them
                t = title.lstrip("•*- ").strip()
                while t and (t[0].isdigit() or t[0] in [")", ".", "-"]):
                    t = t[1:].lstrip(" .-)")
                if t:
                    cleaned_titles.append(t)

            if not cleaned_titles:
                raise ValueError("No valid titles generated")

            return cleaned_titles[:12]
        except Exception as e:
            print(f"[GeminiClient] Error generating outline: {e}")
            if doc_type == "docx":
                return [
                    "Introduction",
                    "Background and Context",
                    "Analysis",
                    "Key Findings",
                    "Recommendations",
                    "Conclusion",
                ]
            else:
                return [
                    "Title Slide",
                    "Agenda",
                    "Problem Statement",
                    "Key Insights",
                    "Solution Proposal",
                    "Implementation Plan",
                    "Next Steps",
                    "Q&A",
                ]


# Global singleton used by the rest of the app
gemini_client = None


def get_gemini_client():
    global gemini_client
    if gemini_client is None:
        gemini_client = GeminiClient()
    return gemini_client
