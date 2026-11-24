function conversationTurnUpdater(turn) {
  const userMessage = turn.querySelector('swc-user-message');
  if (!userMessage) { return null; }
  const systemMessage = turn.ownerDocument.createElement('swc-system-message');
  systemMessage.textContent = 'Here is a concise summary based on the files you shared. I grouped themes by audience and channel.';

  return () => {
    const type = turn.getAttribute('type');
    if (type === 'system') {
      userMessage.replaceWith(systemMessage);
    } else if (type === 'user') {
      systemMessage.replaceWith(userMessage);
    }
  };
}

function responseStatusUpdater(responseStatus) {
  const label = responseStatus.querySelector('[slot="label"]');
  const searchStep = responseStatus.querySelector('swc-response-status-step:last-of-type');
  const searchDescription = searchStep?.querySelector('[slot="description"]');
  if (!label || !searchDescription) { return null; }

  const labels = {
    active: 'Searching repositories for Europe trips',
    complete: 'Thought for 9 seconds',
    stopped: 'You stopped the response',
  };
  const activeDescription = searchDescription.textContent;
  const composeStep = responseStatus.ownerDocument.createElement('swc-response-status-step');
  composeStep.setAttribute('status', 'complete');
  composeStep.innerHTML = `
    <span slot="label">Compose response</span>
    <span slot="description">Synthesizing findings into a structured comparison of available packages with pricing and availability.</span>
  `;

  return () => {
    const status = responseStatus.getAttribute('status');
    const nextLabel = labels[status];
    if (!nextLabel) { return; }
    label.textContent = nextLabel;
    searchStep.setAttribute('status', status);
    searchDescription.textContent = status === 'stopped'
      ? 'Interrupted before this step could finish.'
      : activeDescription;
    // Reinsert the search step to refresh SWC's :host(:last-of-type) styles.
    if (status === 'complete') {
      searchStep.replaceWith(searchStep, composeStep);
    } else {
      composeStep.replaceWith(searchStep);
    }
  };
}

export function createSnippetStateUpdater(root) {
  if (root.localName === 'swc-conversation-turn') { return conversationTurnUpdater(root); }
  if (root.localName === 'swc-response-status') { return responseStatusUpdater(root); }
  return null;
}
