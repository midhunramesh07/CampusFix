const STORAGE_KEY = 'campusfix-issues';
const THEME_KEY = 'campusfix-theme';
const issueDialog = document.querySelector('#issueDialog');
const dialogContent = document.querySelector('#dialogContent');
const toastRegion = document.querySelector('#toastRegion');
const issueTableBody = document.querySelector('#issueTableBody');
const emptyState = document.querySelector('#emptyState');
const reportForm = document.querySelector('#reportForm');
let issues = loadFromLocalStorage();
let currentView = 'dashboard';
let toastTimer;

function createSampleIssues() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: 'CF-1001', title: 'Projector not working', description: 'The projector in the main lecture room powers on, but no image appears on the screen. The remote has fresh batteries.', category: 'Classroom', priority: 'High', location: 'Science Block, Room 204', reporter: 'Aarav Menon', email: 'aarav.menon@college.edu', createdAt: new Date(now - day * 0.3).toISOString(), status: 'Pending' },
    { id: 'CF-1002', title: 'Wi-Fi connection unavailable', description: 'Students are unable to connect to the campus Wi-Fi near the east wing study area since this morning.', category: 'Network / Internet', priority: 'Critical', location: 'East Wing, 2nd Floor', reporter: 'Nisha Rao', email: 'nisha.rao@college.edu', createdAt: new Date(now - day * 1.2).toISOString(), status: 'In Progress' },
    { id: 'CF-1003', title: 'Library computer not starting', description: 'The workstation at desk 12 does not power on after pressing the power button. The cable appears connected.', category: 'Library', priority: 'Medium', location: 'Central Library, Desk 12', reporter: 'Kabir Shah', email: 'kabir.shah@college.edu', createdAt: new Date(now - day * 2.1).toISOString(), status: 'Pending' },
    { id: 'CF-1004', title: 'Hostel water leakage', description: 'A small but steady leak is coming from the pipe beneath the washbasin. The floor is getting wet.', category: 'Hostel', priority: 'High', location: 'Cedar Hall, Room 318', reporter: 'Meera Iyer', email: 'meera.iyer@college.edu', createdAt: new Date(now - day * 3.4).toISOString(), status: 'Resolved' },
    { id: 'CF-1005', title: 'Laboratory system issue', description: 'The desktop in workstation 07 restarts repeatedly before the operating system loads.', category: 'Laboratory', priority: 'Low', location: 'Engineering Lab, Station 07', reporter: 'Rohan Das', email: 'rohan.das@college.edu', createdAt: new Date(now - day * 5.6).toISOString(), status: 'Resolved' }
  ];
}

function loadFromLocalStorage() {
  const savedIssues = localStorage.getItem(STORAGE_KEY);
  if (!savedIssues) {
    const sampleIssues = createSampleIssues();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleIssues));
    return sampleIssues;
  }

  try {
    const parsedIssues = JSON.parse(savedIssues);
    if (Array.isArray(parsedIssues)) return parsedIssues;
  } catch (error) {
    console.error('Could not read saved CampusFix issues:', error);
  }

  const sampleIssues = createSampleIssues();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleIssues));
  return sampleIssues;
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function getNextIssueId() {
  const highestId = issues.reduce((highest, issue) => {
    const match = issue.id.match(/^CF-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 1000);
  return `CF-${highestId + 1}`;
}

function formatDate(dateString, includeTime = false) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  const options = includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function getPriorityClass(priority) {
  return `priority-${String(priority).toLowerCase()}`;
}

function getStatusClass(status) {
  return `status-${String(status).toLowerCase().replaceAll(' ', '-')}`;
}

function getFilteredIssues(sourceIssues = issues, scope = currentView) {
  const searchInput = scope === 'dashboard'
    ? document.querySelector('#issueSearch')
    : document.querySelector(`#${scope}View .shared-search`);
  const filterRoot = scope === 'dashboard' ? document : document.querySelector(`#${scope}View`);
  const categorySelect = scope === 'dashboard' ? document.querySelector('#categoryFilter') : filterRoot.querySelector('.shared-category-filter');
  const prioritySelect = scope === 'dashboard' ? document.querySelector('#priorityFilter') : filterRoot.querySelector('.shared-priority-filter');
  const statusSelect = scope === 'dashboard' ? document.querySelector('#statusFilter') : filterRoot.querySelector('.shared-status-filter');
  const sortSelect = scope === 'dashboard' ? document.querySelector('#sortOrder') : filterRoot.querySelector('.shared-sort');
  const searchTerm = (searchInput?.value || '').trim().toLowerCase();
  const category = categorySelect?.value || 'all';
  const priority = prioritySelect?.value || 'all';
  const status = statusSelect?.value || 'all';

  let visibleIssues = sourceIssues.filter((issue) => {
    const searchableText = [issue.id, issue.title, issue.category, issue.location, issue.reporter].join(' ').toLowerCase();
    return (!searchTerm || searchableText.includes(searchTerm))
      && (category === 'all' || issue.category === category)
      && (priority === 'all' || issue.priority === priority)
      && (status === 'all' || issue.status === status);
  });

  if (scope === 'resolved') visibleIssues = visibleIssues.filter((issue) => issue.status === 'Resolved');
  const sortOrder = sortSelect?.value || 'newest';
  visibleIssues.sort((firstIssue, secondIssue) => {
    const dateDifference = new Date(secondIssue.createdAt).getTime() - new Date(firstIssue.createdAt).getTime();
    return sortOrder === 'oldest' ? -dateDifference : dateDifference;
  });
  return visibleIssues;
}

function createIssueRow(issue) {
  return `<tr>
    <td><div class="issue-name"><strong>${escapeHtml(issue.title)}</strong><small>${escapeHtml(issue.id)}</small></div></td>
    <td><span class="category-label">${escapeHtml(issue.category)}</span></td>
    <td><span class="priority-badge ${getPriorityClass(issue.priority)}">${escapeHtml(issue.priority)}</span></td>
    <td>${escapeHtml(issue.location)}</td>
    <td>${escapeHtml(issue.reporter)}</td>
    <td>${escapeHtml(formatDate(issue.createdAt))}</td>
    <td><span class="status-badge ${getStatusClass(issue.status)}">${escapeHtml(issue.status)}</span></td>
    <td><div class="row-actions"><button class="row-action" type="button" data-action="view" data-id="${escapeHtml(issue.id)}" aria-label="View ${escapeHtml(issue.id)}">View</button><button class="row-action" type="button" data-action="edit" data-id="${escapeHtml(issue.id)}" aria-label="Edit ${escapeHtml(issue.id)}">Edit</button><button class="row-action delete-action" type="button" data-action="delete" data-id="${escapeHtml(issue.id)}" aria-label="Delete ${escapeHtml(issue.id)}">Delete</button></div></td>
  </tr>`;
}

function displayIssues() {
  const dashboardIssues = getFilteredIssues(issues, 'dashboard');
  const recentIssues = currentView === 'dashboard' ? dashboardIssues.slice(0, 5) : dashboardIssues;
  issueTableBody.innerHTML = recentIssues.map(createIssueRow).join('');
  emptyState.hidden = recentIssues.length > 0;
  document.querySelector('#resultCount').textContent = `Showing ${recentIssues.length} ${recentIssues.length === 1 ? 'issue' : 'issues'}${currentView === 'dashboard' && dashboardIssues.length > 5 ? ' (5 most recent)' : ''}`;

  document.querySelectorAll('.view-section[id="issuesView"] .shared-table-body, .view-section[id="resolvedView"] .shared-table-body').forEach((tableBody) => {
    const section = tableBody.closest('.view-section');
    const scopedIssues = getFilteredIssues(issues, section.id.replace('View', ''));
    tableBody.innerHTML = scopedIssues.map(createIssueRow).join('');
    section.querySelector('.shared-empty').hidden = scopedIssues.length > 0;
    section.querySelector('.shared-result-count').textContent = `Showing ${scopedIssues.length} ${scopedIssues.length === 1 ? 'issue' : 'issues'}`;
  });
}

function updateDashboard() {
  document.querySelector('#totalIssues').textContent = issues.length;
  document.querySelector('#pendingIssues').textContent = issues.filter((issue) => issue.status === 'Pending').length;
  document.querySelector('#progressIssues').textContent = issues.filter((issue) => issue.status === 'In Progress').length;
  document.querySelector('#resolvedIssues').textContent = issues.filter((issue) => issue.status === 'Resolved').length;
  document.querySelector('#highPriorityIssues').textContent = issues.filter((issue) => ['High', 'Critical'].includes(issue.priority)).length;
  document.querySelector('#issueNavCount').textContent = issues.length;
  displayIssues();
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toastRegion.innerHTML = `<div class="toast${isError ? ' is-error' : ''}"><span class="toast-mark" aria-hidden="true">${isError ? '!' : '✓'}</span><span>${escapeHtml(message)}</span></div>`;
  toastTimer = window.setTimeout(() => { toastRegion.innerHTML = ''; }, 3200);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-section').forEach((section) => {
    const isCurrent = section.id === `${view}View`;
    section.hidden = !isCurrent;
    section.classList.toggle('is-visible', isCurrent);
  });
  document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.view === view);
  });
  const titles = { dashboard: 'Dashboard', report: 'Report issue', issues: 'All issues', resolved: 'Resolved issues', about: 'About CampusFix' };
  document.querySelector('#breadcrumbCurrent').textContent = titles[view] || 'Dashboard';
  document.querySelector('#sidebar').classList.remove('is-open');
  document.querySelector('#sidebarScrim').classList.remove('is-open');
  document.querySelector('#menuToggle').setAttribute('aria-expanded', 'false');
  displayIssues();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addIssue(event) {
  event.preventDefault();
  if (!reportForm.reportValidity()) return;
  const formData = new FormData(reportForm);
  const newIssue = {
    id: getNextIssueId(),
    title: formData.get('title').trim(),
    description: formData.get('description').trim(),
    category: formData.get('category'),
    priority: formData.get('priority'),
    location: formData.get('location').trim(),
    reporter: formData.get('reporter').trim(),
    email: formData.get('email').trim(),
    createdAt: new Date().toISOString(),
    status: 'Pending'
  };
  issues.unshift(newIssue);
  saveToLocalStorage();
  reportForm.reset();
  document.querySelectorAll('.shared-search').forEach((input) => { input.value = ''; });
  document.querySelectorAll('.shared-category-filter, .shared-priority-filter, .shared-status-filter').forEach((select) => { select.value = 'all'; });
  document.querySelectorAll('.shared-sort').forEach((select) => { select.value = 'newest'; });
  document.querySelector('#issueSearch').value = '';
  document.querySelector('#categoryFilter').value = 'all';
  document.querySelector('#priorityFilter').value = 'all';
  document.querySelector('#statusFilter').value = 'all';
  document.querySelector('#sortOrder').value = 'newest';
  updateDashboard();
  setView('issues');
  showToast('Issue reported successfully');
}

function findIssue(issueId) {
  return issues.find((issue) => issue.id === issueId);
}

function viewIssue(issueId) {
  const issue = findIssue(issueId);
  if (!issue) return;
  dialogContent.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">ISSUE DETAILS</p><h2 id="dialogHeading">${escapeHtml(issue.title)}</h2><span class="detail-id">${escapeHtml(issue.id)} · Reported ${escapeHtml(formatDate(issue.createdAt, true))}</span></div><button class="dialog-close" type="button" data-dialog-close aria-label="Close dialog">×</button></div>
    <div class="detail-grid"><div class="detail-item detail-wide"><span class="detail-label">Description</span><span class="detail-value detail-description">${escapeHtml(issue.description)}</span></div><div class="detail-item"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(issue.category)}</span></div><div class="detail-item"><span class="detail-label">Priority</span><span class="detail-value"><span class="priority-badge ${getPriorityClass(issue.priority)}">${escapeHtml(issue.priority)}</span></span></div><div class="detail-item"><span class="detail-label">Location</span><span class="detail-value">${escapeHtml(issue.location)}</span></div><div class="detail-item"><span class="detail-label">Reporter name</span><span class="detail-value">${escapeHtml(issue.reporter)}</span></div><div class="detail-item detail-wide"><span class="detail-label">Reporter email</span><span class="detail-value">${escapeHtml(issue.email)}</span></div></div>
    <div class="dialog-status-control"><label for="viewStatus">Status</label><select id="viewStatus" data-issue-id="${escapeHtml(issue.id)}"><option${issue.status === 'Pending' ? ' selected' : ''}>Pending</option><option${issue.status === 'In Progress' ? ' selected' : ''}>In Progress</option><option${issue.status === 'Resolved' ? ' selected' : ''}>Resolved</option></select></div>
    <div class="dialog-footer"><button class="danger-button" type="button" data-dialog-action="delete" data-id="${escapeHtml(issue.id)}">Delete issue</button><div class="dialog-footer-actions"><button class="secondary-button" type="button" data-dialog-action="edit" data-id="${escapeHtml(issue.id)}">Edit issue</button><button class="primary-button" type="button" data-dialog-close>Done</button></div></div>`;
  issueDialog.showModal();
}

function editIssue(issueId) {
  const issue = findIssue(issueId);
  if (!issue) return;
  const categories = ['Classroom', 'Laboratory', 'Library', 'Hostel', 'Transport', 'Network / Internet', 'Electrical', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Pending', 'In Progress', 'Resolved'];
  const optionList = (values, selectedValue) => values.map((value) => `<option${value === selectedValue ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
  dialogContent.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">EDIT REPORT · ${escapeHtml(issue.id)}</p><h2 id="dialogHeading">Update issue</h2></div><button class="dialog-close" type="button" data-dialog-close aria-label="Close dialog">×</button></div>
    <form class="dialog-form" id="editIssueForm" data-id="${escapeHtml(issue.id)}"><label class="dialog-field">Issue title<input name="title" type="text" maxlength="100" value="${escapeHtml(issue.title)}" required></label><label class="dialog-field">Description<textarea name="description" rows="4" maxlength="1000" required>${escapeHtml(issue.description)}</textarea></label><div class="dialog-form-grid"><label class="dialog-field">Category<select name="category" required>${optionList(categories, issue.category)}</select></label><label class="dialog-field">Priority<select name="priority" required>${optionList(priorities, issue.priority)}</select></label><label class="dialog-field">Location<input name="location" type="text" maxlength="120" value="${escapeHtml(issue.location)}" required></label><label class="dialog-field">Status<select name="status" required>${optionList(statuses, issue.status)}</select></label><label class="dialog-field">Reporter name<input name="reporter" type="text" maxlength="80" value="${escapeHtml(issue.reporter)}" required></label><label class="dialog-field">Reporter email<input name="email" type="email" maxlength="120" value="${escapeHtml(issue.email)}" required></label></div><div class="dialog-footer"><span class="detail-id">Created ${escapeHtml(formatDate(issue.createdAt, true))}</span><div class="dialog-footer-actions"><button class="secondary-button" type="button" data-dialog-close>Cancel</button><button class="primary-button" type="submit">Save changes</button></div></div></form>`;
  issueDialog.showModal();
}

function saveEditedIssue(event) {
  event.preventDefault();
  const editForm = event.target;
  if (!editForm.reportValidity()) return;
  const issue = findIssue(editForm.dataset.id);
  if (!issue) return;
  const formData = new FormData(editForm);
  const previousStatus = issue.status;
  issue.title = formData.get('title').trim();
  issue.description = formData.get('description').trim();
  issue.category = formData.get('category');
  issue.priority = formData.get('priority');
  issue.location = formData.get('location').trim();
  issue.status = formData.get('status');
  issue.reporter = formData.get('reporter').trim();
  issue.email = formData.get('email').trim();
  saveToLocalStorage();
  issueDialog.close();
  updateDashboard();
  showToast(previousStatus === issue.status ? 'Issue updated successfully' : 'Issue updated successfully');
}

function changeIssueStatus(issueId, newStatus) {
  const issue = findIssue(issueId);
  if (!issue || issue.status === newStatus) return;
  issue.status = newStatus;
  saveToLocalStorage();
  updateDashboard();
  showToast('Status changed successfully');
  viewIssue(issueId);
}

function deleteIssue(issueId) {
  const issue = findIssue(issueId);
  if (!issue) return;
  dialogContent.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">DELETE REPORT · ${escapeHtml(issue.id)}</p><h2 id="dialogHeading">Delete this issue?</h2></div><button class="dialog-close" type="button" data-dialog-close aria-label="Close dialog">×</button></div><p class="confirm-copy">Are you sure you want to delete this issue? This action cannot be undone.</p><div class="dialog-footer"><span class="detail-id">${escapeHtml(issue.title)}</span><div class="dialog-footer-actions"><button class="secondary-button" type="button" data-dialog-close>Cancel</button><button class="danger-button" type="button" data-confirm-delete="${escapeHtml(issue.id)}">Delete issue</button></div></div>`;
  issueDialog.showModal();
}

function confirmDeleteIssue(issueId) {
  issues = issues.filter((issue) => issue.id !== issueId);
  saveToLocalStorage();
  issueDialog.close();
  updateDashboard();
  showToast('Issue deleted successfully');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  document.querySelector('#themeToggle').setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  document.querySelector('.theme-icon').textContent = isDark ? '☀' : '☾';
  document.querySelector('.theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';
}

function setupTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  document.querySelector('#themeToggle').addEventListener('click', () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  });
}

function setupNavigation() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  const menuToggle = document.querySelector('#menuToggle');
  const sidebar = document.querySelector('#sidebar');
  const sidebarScrim = document.querySelector('#sidebarScrim');
  function closeMenu() {
    sidebar.classList.remove('is-open');
    sidebarScrim.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    sidebarScrim.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  sidebarScrim.addEventListener('click', closeMenu);
}

function setupFilters() {
  const filterControls = document.querySelectorAll('#issueSearch, #categoryFilter, #priorityFilter, #statusFilter, #sortOrder, .shared-search, .shared-category-filter, .shared-priority-filter, .shared-status-filter, .shared-sort');
  filterControls.forEach((control) => {
    control.addEventListener(control.matches('input[type="search"]') ? 'input' : 'change', displayIssues);
  });
  document.querySelectorAll('#clearFilters, .shared-clear-filters').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.view-section') || document;
      section.querySelectorAll('input[type="search"]').forEach((input) => { input.value = ''; });
      section.querySelectorAll('select').forEach((select) => { select.value = select.id === 'sortOrder' || select.classList.contains('shared-sort') ? 'newest' : 'all'; });
      displayIssues();
    });
  });
}

function setupIssueActions() {
  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const { action, id } = actionButton.dataset;
      if (action === 'view') viewIssue(id);
      if (action === 'edit') editIssue(id);
      if (action === 'delete') deleteIssue(id);
      return;
    }
    if (event.target.closest('[data-dialog-close]')) {
      issueDialog.close();
      return;
    }
    const confirmButton = event.target.closest('[data-confirm-delete]');
    if (confirmButton) confirmDeleteIssue(confirmButton.dataset.confirmDelete);
    const dialogAction = event.target.closest('[data-dialog-action]');
    if (dialogAction) {
      const { dialogAction: action, id } = dialogAction.dataset;
      if (action === 'edit') editIssue(id);
      if (action === 'delete') deleteIssue(id);
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('#viewStatus')) changeIssueStatus(event.target.dataset.issueId, event.target.value);
  });
  document.addEventListener('submit', (event) => {
    if (event.target.matches('#editIssueForm')) saveEditedIssue(event);
  });
  issueDialog.addEventListener('click', (event) => {
    if (event.target === issueDialog) issueDialog.close();
  });
}

function setTodayLabel() {
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  document.querySelector('#todayLabel').textContent = `CAMPUS OPERATIONS · ${today.toUpperCase()}`;
}

reportForm.addEventListener('submit', addIssue);
setupNavigation();
setupTheme();
setupFilters();
setupIssueActions();
setTodayLabel();
updateDashboard();