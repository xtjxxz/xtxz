(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var html = doc.documentElement;

  var themeToggle = doc.getElementById('themeToggle');
  var backToTop = doc.getElementById('backToTop');
  var toastContainer = doc.getElementById('toastContainer');
  var copyButtons = doc.querySelectorAll('.copy-btn');
  var downloadItems = Array.prototype.slice.call(doc.querySelectorAll('.download-item'));
  var filterTabs = Array.prototype.slice.call(doc.querySelectorAll('.filter-tab'));
  var searchInput = doc.getElementById('systemSearch');
  var searchClear = doc.getElementById('searchClear');
  var noResults = doc.getElementById('noResults');

  var activeFilter = 'all';
  var searchQuery = '';

  var THEME_KEY = 'xtxz-theme';
  var DARK_CLASS = 'dark';

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK_CLASS;
    }
    return 'light';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
    }
  }

  function applyTheme(theme) {
    if (theme === DARK_CLASS) {
      html.setAttribute('data-theme', DARK_CLASS);
      doc.querySelector('meta[name="theme-color"]').setAttribute('content', '#1e293b');
    } else {
      html.removeAttribute('data-theme');
      doc.querySelector('meta[name="theme-color"]').setAttribute('content', '#4a8cdb');
    }
  }

  function toggleTheme() {
    var current = html.getAttribute('data-theme');
    var next = current === DARK_CLASS ? 'light' : DARK_CLASS;
    applyTheme(next);
    saveTheme(next);
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored) {
      applyTheme(stored);
    } else {
      var system = getSystemTheme();
      applyTheme(system);
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? DARK_CLASS : 'light');
      }
    });
  }

  var toastTimer = null;

  function showToast(message, type) {
    type = type || 'success';
    if (!toastContainer) return;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    var existing = toastContainer.querySelector('.toast');
    if (existing) {
      existing.classList.add('fade-out');
      existing.addEventListener('animationend', function () {
        if (existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
      });
    }

    var icon = type === 'success' ? '✅' : '❌';
    var toast = doc.createElement('div');
    toast.className = 'toast ' + type;
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + message + '</span>';

    toastContainer.appendChild(toast);

    toastTimer = setTimeout(function () {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
      toastTimer = null;
    }, 2000);
  }

  function showCopied(btn) {
    var originalHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<span class="btn-icon">✓</span> 已复制';

    setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = originalHTML;
    }, 1800);
  }

  function fallbackCopy(btn, url) {
    var textarea = doc.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('aria-hidden', 'true');
    body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      var success = doc.execCommand('copy');
      if (success) {
        showCopied(btn);
        showToast('链接已复制到剪贴板', 'success');
      } else {
        showToast('复制失败，请手动复制链接', 'error');
      }
    } catch (e) {
      showToast('复制失败，请手动复制链接', 'error');
    }
    body.removeChild(textarea);
  }

  function handleCopy(btn) {
    var url = btn.getAttribute('data-copy');
    if (!url) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showCopied(btn);
        showToast('链接已复制到剪贴板', 'success');
      }).catch(function () {
        fallbackCopy(btn, url);
      });
    } else {
      fallbackCopy(btn, url);
    }
  }

  copyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleCopy(btn);
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCopy(btn);
      }
    });
  });

  var scrollTicking = false;

  function updateBackToTop() {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (backToTop) {
    backToTop.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(function () {
          updateBackToTop();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });

    updateBackToTop();
  }

  doc.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggleTheme();
      showToast(
        (html.getAttribute('data-theme') === DARK_CLASS ? '已切换至暗色模式' : '已切换至亮色模式'),
        'success'
      );
    }
  });

  /* ===== 分类筛选 & 搜索 ===== */
  var filterDirty = false;
  var STAGGER = 0.08; /* seconds between each visible item's entrance */

  function applyFilter() {
    var shown = 0;
    downloadItems.forEach(function (item) {
      var category = item.getAttribute('data-category') || '';
      var title = (item.querySelector('h2') || {}).textContent || '';
      var keywords = item.getAttribute('data-keywords') || '';
      var searchHaystack = title.toLowerCase() + ' ' + keywords.toLowerCase();
      var passFilter = activeFilter === 'all' || category === activeFilter;
      var passSearch = !searchQuery || searchHaystack.indexOf(searchQuery) !== -1;
      var visible = passFilter && passSearch;
      item.classList.toggle('hidden', !visible);
      if (visible) {
        shown++;
        if (filterDirty) {
          /* Restart the staggered entrance animation for shown items */
          item.style.animation = 'none';
          void item.offsetWidth; /* force reflow */
          item.style.animation = 'slideInUp 0.5s ease ' + (shown * STAGGER) + 's backwards';
        }
      }
    });
    filterDirty = false;
    if (noResults) {
      noResults.hidden = shown !== 0;
    }
  }

  function setFilter(filter) {
    activeFilter = filter;
    filterDirty = true;
    filterTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-filter') === filter);
    });
    applyFilter();
  }

  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setFilter(tab.getAttribute('data-filter'));
    });
  });

  if (searchInput && searchClear) {
    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value.trim().toLowerCase();
      searchClear.hidden = searchQuery.length === 0;
      applyFilter();
    });

    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      searchQuery = '';
      searchClear.hidden = true;
      searchInput.focus();
      applyFilter();
    });
  }

  /* ===== 初始化 ===== */
  function init() {
    initTheme();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();