from __future__ import annotations

from lsprotocol.types import (
    TEXT_DOCUMENT_COMPLETION,
    CompletionItem,
    CompletionList,
    CompletionParams,
)
from pygls.lsp.server import LanguageServer

server = LanguageServer("scrummaster-lsp", "v0.1.0")


@server.feature(TEXT_DOCUMENT_COMPLETION)
def completions(_params: CompletionParams | None = None) -> CompletionList:
    """Returns completion items for Scrummaster commands."""
    # params is used by the decorator logic, preserving signature

    items = [
        CompletionItem(label="/scrummaster:setup"),
        CompletionItem(label="/scrummaster:newepic"),
        CompletionItem(label="/scrummaster:newstory"),
        CompletionItem(label="/scrummaster:implement"),
        CompletionItem(label="/scrummaster:status"),
        CompletionItem(label="/scrummaster:revert"),
    ]
    return CompletionList(is_incomplete=False, items=items)


def start_lsp() -> None:
    # In a real scenario, this would be invoked by the VS Code extension
    # starting the Python process with the LSP feature enabled.
    pass
