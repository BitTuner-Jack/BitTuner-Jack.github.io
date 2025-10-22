var $posts = {
    scroller: function () {
        function Scroller() {
            this.callbacks = []
            return this
        }
        Scroller.prototype.bindScrollEvent = function () {
            var _that = this

            window.addEventListener('scroll', function (event) {
                var wait = false
                var beforeOffsetY = window.pageYOffset

                if (wait) return
                wait = true

                setTimeout(function () {
                    var params = {
                        event: event,
                        beforeOffsetY: beforeOffsetY,
                    }
                    _that.callbacks.forEach(function (func) { func(params) })

                    wait = false
                }, 150)
            })
        }

        return Scroller
    },
    showTopic: function (evt) {
        var topicEl = document.getElementById('postTopic')
        var postTitle = document.getElementById('postTitle')

        var postTitleCoordinate = postTitle.getBoundingClientRect()
        var threshold = postTitle.offsetTop + postTitleCoordinate.height

        // show title
        if (window.pageYOffset > threshold) {
            var beforeOffsetY = evt && evt.beforeOffsetY
            var isScrollToTop = beforeOffsetY - window.pageYOffset > 0

            topicEl.classList.remove('is-hidden-topic-bar')

            if (beforeOffsetY - window.pageYOffset === 0) {
                topicEl.classList.remove('is-switch-post-title')
                topicEl.classList.remove('is-show-post-title')
                topicEl.classList.remove('immediately-show')

                if (topicEl.classList.contains('is-show-scrollToTop-tips')) {
                    topicEl.classList.remove('is-show-scrollToTop-tips')
                    topicEl.classList.add('is-flash-scrollToTop-tips')
                }
                else {
                    topicEl.classList.add('immediately-show')
                }
            }
            // scroll to up👆
            else if (isScrollToTop) {
                // show scroll to top tips
                if (window.pageYOffset > window.innerHeight * 2) {
                    topicEl.classList.remove('immediately-show')
                    topicEl.classList.remove('is-show-post-title')
                    topicEl.classList.remove('is-switch-post-title')
                    topicEl.classList.remove('is-flash-scrollToTop-tips')

                    topicEl.classList.add('is-show-scrollToTop-tips')
                }
                // show post title
                else {
                    topicEl.classList.remove('immediately-show')
                    topicEl.classList.remove('is-show-post-title')
                    topicEl.classList.remove('is-show-scrollToTop-tips')
                    topicEl.classList.remove('is-flash-scrollToTop-tips')

                    topicEl.classList.add('is-switch-post-title')
                }
            }
            // scroll to down👇
            else if (beforeOffsetY - window.pageYOffset !== 0) {
                topicEl.classList.remove('immediately-show')
                topicEl.classList.remove('is-switch-post-title')
                topicEl.classList.remove('is-show-scrollToTop-tips')
                topicEl.classList.remove('is-flash-scrollToTop-tips')
                topicEl.classList.add('is-show-post-title')
            }
        }
        else{
            // hidden all
            topicEl.classList.remove('is-flash-scrollToTop-tips')
            topicEl.classList.remove('is-show-scrollToTop-tips')
            topicEl.classList.remove('is-switch-post-title')
            topicEl.classList.remove('is-show-post-title')
            topicEl.classList.remove('immediately-show')

            topicEl.classList.add('is-hidden-topic-bar')
        }
    },
    catalogueHighlight: function () {
        var directory = document.querySelectorAll('.toc a')
        if (directory.length === 0) {
            return false
        }

        var tocContainer = document.querySelector('.toc')
        return function () {
            var contentTocList = []
            var activeClassName = 'is-active'

            directory.forEach(function (link) {
                if (!link.href) return
                var id = decodeURI(link.href).split('#')[1]
                contentTocList.push(document.getElementById(id))
            })
            var spacing = 60
            var activeTopicEl = null
            var scrollTop = window.pageYOffset
            for (var i = 0; i < contentTocList.length; i++) {
                var currentTopic = contentTocList[i]

                if (currentTopic.offsetTop > scrollTop + spacing / 2) {
                    // jump to next loop
                    continue
                }

                if (!activeTopicEl) {
                    activeTopicEl = currentTopic
                } else if (currentTopic.offsetTop + spacing >= activeTopicEl.offsetTop - spacing) {
                    activeTopicEl = currentTopic
                }

                var beforeActiveEl = document.querySelector('.toc' + ' .' + activeClassName)
                beforeActiveEl && beforeActiveEl.classList.remove(activeClassName)

                var selectTarget = '.toc a[href="#' + encodeURI(activeTopicEl.id) + '"]'
                var direc = document.querySelector(selectTarget)
                direc.classList.add(activeClassName)

                var tocContainerHeight = tocContainer.getBoundingClientRect().height
                if (direc.offsetTop >= tocContainerHeight - spacing) {
                    tocContainer.scrollTo({
                        // top: direc.offsetTop - spacing,
                        top: direc.offsetTop + 100 - tocContainerHeight,
                    })
                }
                else {
                    tocContainer.scrollTo({ top: 0 })
                }
            }
        }
    },
    smoothScrollToTop: function() {
        var Y_TopValve = (window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop);
        if (Y_TopValve > 1) {
            window.requestAnimationFrame($posts.smoothScrollToTop);
            scrollTo(0, Math.floor(Y_TopValve * 0.85));
        } else {
            scrollTo(0, 0);
        }
    },
    addValineComment() {
        var el = document.getElementById('vcomments')
        new Valine({
            el: '#vcomments',
            appId: el.dataset.comment_valine_id,
            appKey: el.dataset.comment_valine_key
        })
    },
    mounted: function () {
        // Highlight only plain <pre><code> blocks, skip SSR Hexo blocks (figure.highlight)
        try {
            if (window.hljs) {
                var codeBlocks = document.querySelectorAll('pre code');
                codeBlocks.forEach(function (block) {
                    if (block.closest('figure.highlight')) return; // skip SSR blocks
                    if (block.classList.contains('hljs')) return;   // already highlighted
                    hljs.highlightBlock(block);
                });
            }
        } catch (e) { /* noop */ }

        // Enhance SSR code blocks (Hexo -> figure.highlight)
        try {
            var codeFigures = document.querySelectorAll('figure.highlight')
            codeFigures.forEach(function(fig){
                // Language label from class like: figure.highlight.python
                var classes = (fig.getAttribute('class') || '').split(/\s+/)
                var lang = classes.find(function(c){ return c !== 'highlight' && c !== 'figure' && c.indexOf('highlight') !== 0 }) || ''
                if (lang) {
                    var langBadge = document.createElement('span')
                    langBadge.className = 'code-lang'
                    // Pretty language name mapping
                    var map = {
                        'js': 'JavaScript', 'javascript': 'JavaScript',
                        'ts': 'TypeScript', 'typescript': 'TypeScript',
                        'py': 'Python', 'python': 'Python',
                        'c': 'C', 'cpp': 'C++', 'c++': 'C++',
                        'cs': 'C#', 'csharp': 'C#',
                        'html': 'HTML', 'xml': 'XML', 'json': 'JSON',
                        'yml': 'YAML', 'yaml': 'YAML',
                        'sh': 'Shell', 'bash': 'Bash', 'shell': 'Shell',
                        'go': 'Go', 'golang': 'Go', 'rb': 'Ruby', 'ruby': 'Ruby',
                        'rs': 'Rust', 'rust': 'Rust',
                        'java': 'Java', 'kt': 'Kotlin', 'kotlin': 'Kotlin',
                        'php': 'PHP', 'sql': 'SQL', 'md': 'Markdown', 'markdown': 'Markdown',
                        'swift': 'Swift', 'scala': 'Scala'
                    }
                    var pretty = map[String(lang).toLowerCase()] || lang
                    langBadge.textContent = pretty
                    fig.appendChild(langBadge)
                }

                // Copy button
                var copyBtn = document.createElement('button')
                copyBtn.className = 'code-copy-btn'
                copyBtn.type = 'button'
                copyBtn.textContent = 'Copy'
                copyBtn.addEventListener('click', function(){
                    var codeEl = fig.querySelector('td.code pre') || fig.querySelector('pre code') || fig
                    var text = codeEl.innerText || codeEl.textContent || ''
                    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
                        copyBtn.textContent = 'Copied'
                        setTimeout(function(){ copyBtn.textContent = 'Copy' }, 1200)
                    }).catch(function(){
                        try {
                            var area = document.createElement('textarea')
                            area.value = text
                            document.body.appendChild(area)
                            area.select()
                            document.execCommand('copy')
                            document.body.removeChild(area)
                            copyBtn.textContent = 'Copied'
                            setTimeout(function(){ copyBtn.textContent = 'Copy' }, 1200)
                        } catch (e) { /* noop */ }
                    })
                })
                fig.appendChild(copyBtn)
            })
        } catch (e) { /* noop */ }

        var Scroller = this.scroller()
        var scrollerInstance = new Scroller()

        var catalogueHighlight = this.catalogueHighlight()
        catalogueHighlight && scrollerInstance.callbacks.push(catalogueHighlight)

        scrollerInstance.callbacks.push(this.showTopic)

        scrollerInstance.bindScrollEvent()

        $claudia.fadeInImage(document.querySelectorAll('.post-content img'))

        document.getElementById('postTopic').addEventListener('click', this.smoothScrollToTop)

        window.Valine && this.addValineComment()
    }
}

$posts.mounted()
