" Vim syntax file
" Language:	vasm
" Current Maintainer: Andrew Morris <voltrevo@gmail.com>
" Last Change:	2018 Dec 7

" Quit when a (custom) syntax file was already loaded
if exists('b:current_syntax')
  finish
endif

syn case match

syn keyword     vasmDirective         import
"syn keyword     vasmDeclType
syn keyword     vasmDeclaration       func gfunc

hi def link     vasmDirective         Statement
"hi def link     vasmDeclType          Keyword
hi def link     vasmDeclaration       Keyword

" Keywords within functions
syn keyword     vasmStatement         return break continue assert breakpoint log push back front dup index has negate inc dec get set
syn keyword     vasmConditional       if else
syn keyword     vasmRepeat            loop

hi def link     vasmStatement         Statement
hi def link     vasmConditional       Conditional
hi def link     vasmRepeat            Repeat

" Predefined types
syn match       vasmSignedInts        "i\(8\|16\|32\|64\)\>"
syn match       vasmUnsignedInts      "u\(8\|16\|32\|64\)\>"
syn match       vasmFloats            "f\(8\|16\|32\|64\)\>"

hi def link     vasmSignedInts        Type
hi def link     vasmUnsignedInts      Type
hi def link     vasmFloats            Type

" Predefined functions and values
syn keyword     vasmConstants         true false null
hi def link     vasmConstants         Constant

" Comments; their contents
syn keyword     vasmTodo              contained TODO FIXME XXX BUG
syn cluster     vasmCommentGroup      contains=vasmTodo
syn region      vasmComment           start="/\*" end="\*/" contains=@vasmCommentGroup,@Spell
syn region      vasmComment           start="//" end="$" contains=@vasmCommentGroup,@Spell

hi def link     vasmComment           Comment
hi def link     vasmTodo              Todo

" vasm escapes
" TODO
" syn match       vasmEscapeOctal       display contained "\\[0-7]\{3}"
syn match       vasmEscapeC           display contained +\\[abfnrtv\\'"]+
" syn match       vasmEscapeX           display contained "\\x\x\{2}"
" syn match       vasmEscapeU           display contained "\\u\x\{4}"
" syn match       vasmEscapeBigU        display contained "\\U\x\{8}"
" syn match       vasmEscapeError       display contained +\\[^0-7xuUabfnrtv\\'"]+
"
" hi def link     vasmEscapeOctal       vasmSpecialString
hi def link     vasmEscapeC           vasmSpecialString
" hi def link     vasmEscapeX           vasmSpecialString
" hi def link     vasmEscapeU           vasmSpecialString
" hi def link     vasmEscapeBigU        vasmSpecialString
" hi def link     vasmSpecialString     Special
" hi def link     vasmEscapeError       Error

" Strings and their contents
syn cluster     vasmStringGroup       contains=vasmEscapeC
" syn cluster     vasmStringGroup       contains=vasmEscapeOctal,vasmEscapeC,vasmEscapeX,vasmEscapeU,vasmEscapeBigU,vasmEscapeError
syn region      vasmString            start=+'+ skip=+\\\\\|\\"+ end=+'+ contains=@vasmStringGroup
" syn region      vasmRawString         start=+`+ end=+`+

hi def link     vasmString            String
" hi def link     vasmRawString         String

" Regions
syn region      vasmBlock             start="{" end="}" transparent fold
syn region      vasmParen             start='(' end=')' transparent

" Operators
syn match       vasmOperator          "\(--\|delete\|\(+\|++\|-\|\*\*\?\|\/\|%\|\^\|||\?\|&&\?\|=\|!\|<<\?\|>>\?\|\~\)=\?\)"
hi def link     vasmOperator          Operator

" Labels
syn match       vasmLabel             "\$[a-zA-Z]\w*"
hi def link     vasmLabel             Define

" Integers
syn match       vasmDecimalInt        "\<\d\+\([Ee]\d\+\)\?"
syn match       vasmHexadecimalInt    "\<0x\x\+"
syn match       vasmOctalInt          "\<0\o\+"
syn match       vasmOctalError        "\<0\o*[89]\d*"

hi def link     vasmDecimalInt        Number
hi def link     vasmHexadecimalInt    Number
hi def link     vasmOctalInt          Number
hi def link     vasmOctalError        Error

" Floating point
syn match       vasmFloat             "\<\d\+\.\d*\([Ee][-+]\d\+\)\?\>"
syn match       vasmFloat             "\<\.\d\+\([Ee][-+]\d\+\)\?\>"
syn match       vasmFloat             "\<\d\+[Ee][-+]\d\+\>"

hi def link     vasmFloat             Float

" Space-tab error
syn match vasmSpaceError display " \+\t"me=e-1

" Trailing white space error
syn match vasmSpaceError display excludenl "\s\+$"

hi def link     vasmSpaceError        Error

" Search backwards for a global declaration to start processing the syntax.
"syn sync match goSync grouphere NONE /^\(const\|var\|type\|func\)\>/

" There's a bug in the implementation of grouphere. For now, use the
" following as a more expensive/less precise workaround.
syn sync minlines=500

let b:current_syntax = 'vasm'

" vim: sw=2 sts=2 et

if g:colors_name == 'dracula'
  hi! link Define DraculaGreen
endif
