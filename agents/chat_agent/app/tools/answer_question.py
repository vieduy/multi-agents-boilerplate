"""Answer question tool for QA Agent."""


def answer_question(question: str) -> str:
    """
    Answer a user's question directly.

    This is a simple pass-through tool that allows the agent to
    process and answer questions without needing external API calls.

    Args:
        question: The user's question to answer

    Returns:
        A response indicating the agent should answer the question
    """
    return f"Please answer this question: {question}"
