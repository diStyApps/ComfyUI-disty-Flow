function displayWorkflowFormat() {
    const workflowFormatElement = document.getElementById('workflowFormat');
    if (!workflowFormatElement) return;
    workflowFormatElement.innerHTML = '<p>Loaded API version</p>';
}
export { displayWorkflowFormat };
