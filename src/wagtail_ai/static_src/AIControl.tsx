import React, { useState, useRef } from 'react';
import { EditorState } from 'draft-js';
import { ToolbarButton } from 'draftail';
import { createPortal } from 'react-dom';
import { useOutsideAlerter } from './hooks';
import WandIcon from './WandIcon';
import { handleAppend, handleReplace, processAction } from './utils';

import type { ControlComponentProps } from 'draftail';
import type { Prompt } from './custom';

// Generated by asking ChatGPT 'Generate a list of loading messages which mean "Loading response from AI chat bot"'...
const LOADING_MESSAGES = [
  'Processing your query, please wait...',
  'Analyzing your input, just a moment...',
  'Generating a response, hold on...',
  'Thinking, thinking, thinking...',
  'Fetching data, almost there...',
  'Compiling information, please wait...',
  'Crunching numbers, please be patient...',
  'Analyzing data, loading...',
  'Preparing response, please wait...',
  'Interpreting your message, loading...',
];

function LoadingOverlay() {
  const loadingMessage =
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

  return (
    <div className="Draftail-AI-LoadingOverlay">
      <span>
        <svg className="icon icon-spinner c-spinner" aria-hidden="true">
          <use href="#icon-spinner" />
        </svg>
        {loadingMessage}
      </span>
    </div>
  );
}

function ToolbarDropdown({
  close,
  onAction,
}: {
  close: any;
  onAction: (prompt: Prompt) => void;
}) {
  const toolBarRef = useRef(null);
  // Close the dropdown when user clicks outside of it
  useOutsideAlerter(toolBarRef, close);

  return (
    <div ref={toolBarRef} className="Draftail-AI-ButtonDropdown">
      {window.WAGTAIL_AI_PROMPTS.map((prompt) => (
        <button type="button" onMouseDown={() => onAction(prompt)}>
          <span>{prompt.label}</span> {prompt.description}
        </button>
      ))}
    </div>
  );
}

function AIControl({ getEditorState, onChange }: ControlComponentProps) {
  const editorState = getEditorState() as EditorState;
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<Boolean>(false);
  const [error, setError] = useState(null);
  const aIControlRef = useRef<any>();

  const container = aIControlRef?.current
    ? aIControlRef?.current.closest('[data-draftail-editor-wrapper]')
    : null;

  const handleAction = async (prompt: Prompt) => {
    setError(null);
    setIsDropdownOpen(false);
    setIsLoading(true);
    try {
      if (prompt.method === 'append') {
        onChange(await processAction(editorState, prompt, handleAppend));
      } else {
        onChange(await processAction(editorState, prompt, handleReplace));
      }
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  return (
    <>
      <ToolbarButton
        name="AI Tools"
        title="AI prompts"
        icon={WandIcon}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      />
      <span ref={aIControlRef} />
      {isDropdownOpen ? (
        <ToolbarDropdown
          close={() => setIsDropdownOpen(false)}
          onAction={handleAction}
        />
      ) : null}
      {error && container?.parentNode
        ? createPortal(
            <div className="w-field__errors">
              <svg
                className="icon icon-warning w-field__errors-icon"
                aria-hidden="true"
              >
                <use href="#icon-warning"></use>
              </svg>
              &nbsp;
              <p className="error-message">{error}</p>
            </div>,
            container.parentNode.previousElementSibling,
          )
        : null}
      {isLoading && container
        ? createPortal(<LoadingOverlay />, container)
        : null}
    </>
  );
}

export default AIControl;
