" Indentation
set tabstop=2
set shiftwidth=2
set expandtab
set autoindent

" Don't worry about vi compatibility
set nocompatible

" Try to keep 5 lines of context when scrolling
set scrolloff=5
set sidescrolloff=2

" Create backups
set backup
set backupdir=~/.vim-backups
let backupvar = "set backupext=~" . strftime("%Y-%m-%d-%H:%m:%S")
execute backupvar

" Use that ~/.vim-backups dir for swapfiles too
set swapfile
set dir=~/.vim-backups

" Search options: incremental search, highlight search
set hlsearch
set incsearch

" Allow edit buffers to be hidden
set hidden

" CursorLine is nice, you'll like it
set cursorline

" Line numbers
set number

" Smart case is cool. If all lowercase, do case insensitve search, using
" anything uppercase makes it case sensitive.
set ignorecase
set smartcase

" Plugins with vim-plug
call plug#begin('~/.vim/plugged')
Plug 'vim-airline/vim-airline'
Plug 'dracula/vim'
Plug 'schickling/vim-bufonly'
Plug 'w0rp/ale'
Plug 'leafgarland/typescript-vim'
call plug#end()

silent! colorscheme dracula

let g:ale_fixers = {
\   'javascript': ['eslint'],
\}

let b:ale_fixers = [
\  'trim_whitespace',
\  'remove_trailing_lines',
\]

let g:ale_sign_column_always = 1
let g:ale_fix_on_save = 1
let g:ale_set_highlights = 0
nmap <silent> <C-k> <Plug>(ale_previous_wrap)
nmap <silent> <C-j> <Plug>(ale_next_wrap)

hi Normal ctermbg=0
set colorcolumn=80

" Use autoindent ONLY
autocmd FileType * set nosmartindent|set nocindent

" Fix dracula diff colors (not sure why these are broken on ubuntu)
hi diffAdded ctermfg=84
hi diffRemoved ctermfg=203
