"""
LangGraph Blog Generator Workflow

Uses LangGraph to orchestrate a multi-step blog generation workflow:
1. Research - Gather information on the topic
2. Style Analysis - Retrieve writing style from RAG
3. Outline Generation - Create blog structure
4. Content Generation - Write the full blog post
5. Review & Polish - Refine the final output

Environment Variables Required:
- OPENAI_API_KEY (or other provider key)
- DATABASE_URL (for RAG)
"""

import os
import json
import sys
from typing import TypedDict, Annotated, List, Optional
from operator import add

# LangGraph imports
try:
    from langgraph.graph import StateGraph, END
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_core.prompts import ChatPromptTemplate
except ImportError as e:
    print(json.dumps({
        "error": f"Missing required packages: {e}. Install with: pip install langgraph langchain-openai"
    }))
    sys.exit(1)


# State definition
class BlogGeneratorState(TypedDict):
    # Input
    prompt: str
    title: Optional[str]
    locale: str
    tags: List[str]
    style_profile_id: Optional[str]
    ai_provider: str
    ai_model: Optional[str]
    
    # Processing
    research_notes: str
    style_examples: List[str]
    outline: str
    draft_content: str
    
    # Output
    final_title: str
    final_content: str
    final_excerpt: str
    
    # Progress tracking
    current_step: str
    progress: int
    errors: Annotated[List[str], add]


def get_llm(state: BlogGeneratorState) -> ChatOpenAI:
    """Get the appropriate LLM based on provider and model."""
    provider = state.get("ai_provider", "OPENAI")
    model = state.get("ai_model")
    
    if provider == "OPENAI":
        return ChatOpenAI(
            model=model or "gpt-4o",
            temperature=0.7,
            api_key=os.environ.get("OPENAI_API_KEY")
        )
    elif provider == "ANTHROPIC":
        # Would need langchain-anthropic
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model or "claude-3-5-sonnet-20241022",
            temperature=0.7,
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
    else:
        # Default to OpenAI
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7
        )


def research_node(state: BlogGeneratorState) -> dict:
    """Research the topic and gather information."""
    llm = get_llm(state)
    
    prompt = state["prompt"]
    locale = state.get("locale", "ko")
    
    language_instruction = "한국어로 작성하세요." if locale == "ko" else "Write in English."
    
    messages = [
        SystemMessage(content=f"""You are a research assistant. Gather key information, facts, and insights about the given topic.
{language_instruction}
Provide structured research notes that will help write a comprehensive blog post."""),
        HumanMessage(content=f"Research topic: {prompt}")
    ]
    
    response = llm.invoke(messages)
    
    return {
        "research_notes": response.content,
        "current_step": "research",
        "progress": 20
    }


def style_analysis_node(state: BlogGeneratorState) -> dict:
    """Retrieve writing style examples from RAG (if available)."""
    style_profile_id = state.get("style_profile_id")
    
    if not style_profile_id:
        return {
            "style_examples": [],
            "current_step": "style_analysis",
            "progress": 30
        }
    
    # In production, this would query the vector database
    # For now, return empty list
    # TODO: Implement actual RAG retrieval
    return {
        "style_examples": [],
        "current_step": "style_analysis",
        "progress": 30
    }


def outline_node(state: BlogGeneratorState) -> dict:
    """Generate a blog post outline."""
    llm = get_llm(state)
    
    prompt = state["prompt"]
    research_notes = state.get("research_notes", "")
    title = state.get("title", "")
    locale = state.get("locale", "ko")
    
    language_instruction = "한국어로 작성하세요." if locale == "ko" else "Write in English."
    
    title_instruction = f"Title: {title}" if title else "Generate an appropriate title."
    
    messages = [
        SystemMessage(content=f"""You are a blog content strategist. Create a detailed outline for a blog post.
{language_instruction}
Include:
1. A compelling title (if not provided)
2. Introduction hook
3. Main sections (3-5)
4. Key points for each section
5. Conclusion approach
6. Call to action (if appropriate)"""),
        HumanMessage(content=f"""Topic: {prompt}
{title_instruction}

Research Notes:
{research_notes}

Create a comprehensive outline.""")
    ]
    
    response = llm.invoke(messages)
    
    return {
        "outline": response.content,
        "current_step": "outline",
        "progress": 50
    }


def content_generation_node(state: BlogGeneratorState) -> dict:
    """Generate the full blog content."""
    llm = get_llm(state)
    
    outline = state.get("outline", "")
    research_notes = state.get("research_notes", "")
    style_examples = state.get("style_examples", [])
    locale = state.get("locale", "ko")
    tags = state.get("tags", [])
    
    language_instruction = "한국어로 작성하세요." if locale == "ko" else "Write in English."
    
    style_instruction = ""
    if style_examples:
        style_instruction = f"""
Writing Style Examples (match this style):
{chr(10).join(style_examples[:3])}
"""
    
    tags_instruction = f"Tags to incorporate: {', '.join(tags)}" if tags else ""
    
    messages = [
        SystemMessage(content=f"""You are an expert blog writer. Write a complete, engaging blog post based on the outline.
{language_instruction}
{style_instruction}

Guidelines:
- Write in Markdown format
- Use ## for main headings, ### for subheadings
- Include introduction and conclusion
- Make it informative yet engaging
- Aim for 1000-1500 words
- Use bullet points and lists where appropriate
{tags_instruction}"""),
        HumanMessage(content=f"""Outline:
{outline}

Research Notes:
{research_notes}

Write the full blog post now.""")
    ]
    
    response = llm.invoke(messages)
    
    return {
        "draft_content": response.content,
        "current_step": "content_generation",
        "progress": 80
    }


def review_and_polish_node(state: BlogGeneratorState) -> dict:
    """Review and polish the final content."""
    llm = get_llm(state)
    
    draft_content = state.get("draft_content", "")
    locale = state.get("locale", "ko")
    
    language_instruction = "한국어로 작성하세요." if locale == "ko" else "Write in English."
    
    # Extract title from content
    title_messages = [
        SystemMessage(content=f"""Extract the main title from this blog post. Return ONLY the title text, nothing else.
{language_instruction}"""),
        HumanMessage(content=draft_content[:500])
    ]
    
    title_response = llm.invoke(title_messages)
    extracted_title = title_response.content.strip().replace("#", "").strip()
    
    # Generate excerpt
    excerpt_messages = [
        SystemMessage(content=f"""Write a compelling 1-2 sentence excerpt/summary for this blog post.
{language_instruction}
The excerpt should make readers want to read the full article."""),
        HumanMessage(content=draft_content[:1000])
    ]
    
    excerpt_response = llm.invoke(excerpt_messages)
    
    # Final polish
    polish_messages = [
        SystemMessage(content=f"""Review and polish this blog post. Fix any grammar issues, improve flow, and ensure consistency.
{language_instruction}
Return the polished version in Markdown format."""),
        HumanMessage(content=draft_content)
    ]
    
    polish_response = llm.invoke(polish_messages)
    
    return {
        "final_title": state.get("title") or extracted_title,
        "final_content": polish_response.content,
        "final_excerpt": excerpt_response.content.strip(),
        "current_step": "complete",
        "progress": 100
    }


def create_blog_generator_graph() -> StateGraph:
    """Create the LangGraph workflow."""
    workflow = StateGraph(BlogGeneratorState)
    
    # Add nodes
    workflow.add_node("research", research_node)
    workflow.add_node("style_analysis", style_analysis_node)
    workflow.add_node("outline", outline_node)
    workflow.add_node("content_generation", content_generation_node)
    workflow.add_node("review_and_polish", review_and_polish_node)
    
    # Define edges
    workflow.set_entry_point("research")
    workflow.add_edge("research", "style_analysis")
    workflow.add_edge("style_analysis", "outline")
    workflow.add_edge("outline", "content_generation")
    workflow.add_edge("content_generation", "review_and_polish")
    workflow.add_edge("review_and_polish", END)
    
    return workflow.compile()


def generate_blog_post(
    prompt: str,
    title: Optional[str] = None,
    locale: str = "ko",
    tags: Optional[List[str]] = None,
    style_profile_id: Optional[str] = None,
    ai_provider: str = "OPENAI",
    ai_model: Optional[str] = None
) -> dict:
    """Generate a blog post using LangGraph workflow."""
    
    # Create and run the workflow
    graph = create_blog_generator_graph()
    
    initial_state: BlogGeneratorState = {
        "prompt": prompt,
        "title": title,
        "locale": locale,
        "tags": tags or [],
        "style_profile_id": style_profile_id,
        "ai_provider": ai_provider,
        "ai_model": ai_model,
        "research_notes": "",
        "style_examples": [],
        "outline": "",
        "draft_content": "",
        "final_title": "",
        "final_content": "",
        "final_excerpt": "",
        "current_step": "starting",
        "progress": 0,
        "errors": []
    }
    
    # Run the graph
    final_state = graph.invoke(initial_state)
    
    return {
        "title": final_state["final_title"],
        "content": final_state["final_content"],
        "excerpt": final_state["final_excerpt"],
        "metadata": {
            "locale": locale,
            "tags": tags or [],
            "generator": "langgraph",
            "ai_provider": ai_provider,
            "ai_model": ai_model
        }
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No input provided. Usage: python langgraph_workflow.py '<json_input>'"
        }))
        sys.exit(1)
    
    try:
        # Parse input JSON from command line
        input_data = json.loads(sys.argv[1])
        
        prompt = input_data.get("prompt")
        title = input_data.get("title")
        locale = input_data.get("locale", "ko")
        tags = input_data.get("tags", [])
        style_profile_id = input_data.get("styleProfileId")
        ai_provider = input_data.get("aiProvider", "OPENAI")
        ai_model = input_data.get("aiModel")
        
        if not prompt:
            print(json.dumps({
                "error": "Prompt is required"
            }))
            sys.exit(1)
        
        # Generate the blog post
        result = generate_blog_post(
            prompt=prompt,
            title=title,
            locale=locale,
            tags=tags,
            style_profile_id=style_profile_id,
            ai_provider=ai_provider,
            ai_model=ai_model
        )
        
        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON input: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": f"Generation failed: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
