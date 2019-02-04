" Vim syntax file
" Language:	vortex
" Current Maintainer: Andrew Morris <voltrevo@gmail.com>
" Last Change:	2018 Sep 20

" Quit when a (custom) syntax file was already loaded
if exists('b:current_syntax')
  finish
endif

syn case match

syn keyword     vxDirective         import from of
syn keyword     vxDeclType          class
syn keyword     vxDeclaration       func static

hi def link     vxDirective         Statement
hi def link     vxDeclType          Keyword
hi def link     vxDeclaration       Keyword

" Keywords within functions
syn keyword     vxStatement         return break continue assert breakpoint log
syn keyword     vxConditional       if else switch default
syn keyword     vxRepeat            for

hi def link     vxStatement         Statement
hi def link     vxConditional       Conditional
hi def link     vxRepeat            Repeat

" Predefined types
syn keyword     vxType              bool string
syn match       vxSignedInts        "\([0-9]\)\@<=i\(8\|16\|32\|64\)\>"
syn match       vxUnsignedInts      "\([0-9]\)\@<=u\(\|8\|16\|32\|64\)\>"
syn match       vxFloats            "\([0-9]\)\@<=f\(8\|16\|32\|64\)\>"

hi def link     vxType              Type
hi def link     vxSignedInts        Type
hi def link     vxUnsignedInts      Type
hi def link     vxFloats            Type

" Predefined functions and values
syn keyword     vxConstants         true false null
hi def link     vxConstants         Constant

" Comments; their contents
syn keyword     vxTodo              contained TODO FIXME XXX BUG
syn cluster     vxCommentGroup      contains=vxTodo
syn region      vxComment           start="/\*" end="\*/" contains=@vxCommentGroup,@Spell
syn region      vxComment           start="//" end="$" contains=@vxCommentGroup,@Spell

hi def link     vxComment           Comment
hi def link     vxTodo              Todo

" vx escapes
" TODO
" syn match       vxEscapeOctal       display contained "\\[0-7]\{3}"
syn match       vxEscapeC           display contained +\\[abfnrtv\\'"]+
" syn match       vxEscapeX           display contained "\\x\x\{2}"
" syn match       vxEscapeU           display contained "\\u\x\{4}"
" syn match       vxEscapeBigU        display contained "\\U\x\{8}"
" syn match       vxEscapeError       display contained +\\[^0-7xuUabfnrtv\\'"]+
"
" hi def link     vxEscapeOctal       vxSpecialString
hi def link     vxEscapeC           vxSpecialString
" hi def link     vxEscapeX           vxSpecialString
" hi def link     vxEscapeU           vxSpecialString
" hi def link     vxEscapeBigU        vxSpecialString
" hi def link     vxSpecialString     Special
" hi def link     vxEscapeError       Error

" Strings and their contents
syn cluster     vxStringGroup       contains=vxEscapeC
" syn cluster     vxStringGroup       contains=vxEscapeOctal,vxEscapeC,vxEscapeX,vxEscapeU,vxEscapeBigU,vxEscapeError
syn region      vxString            start=+'+ skip=+\\\\\|\\"+ end=+'+ contains=@vxStringGroup
" syn region      vxRawString         start=+`+ end=+`+

hi def link     vxString            String
" hi def link     vxRawString         String

syn match       vxString            "\(import  *\)\@<=[\w@.]\w*\/\(\w\w*\/\)*"
syn match       vxString            "\(import  *[\w@.]\w*\/\(\w\w*\/\)*\<[a-zA-Z]\w*\>\)\@<=\.vx"

" Regions
syn region      vxBlock             start="{" end="}" transparent fold
syn region      vxParen             start='(' end=')' transparent

" Functions
syn match       vxMethod            "\(:\)\@<=\<[a-zA-Z]\w*\>"
hi def link     vxMethod            Function

" Operators
syn match       vxOperator          "\(^\|[a-zA-Z0-9; ()]\)\@<=\(=>\|:=\|--\|delete\|in\|\(+\|++\|-\|\*\*\?\|\/\|%\|\^\|||\?\|&&\?\|=\|!\|<<\?\|>>\?\|\~\)=\?\)\($\|[a-zA-Z0-9; ()]\)\@="
hi def link     vxOperator          Operator

" Name creation
syn match       vxNameCreation      "\<\([a-zA-Z]\w*\)\>\( *\(:=\|of\)\)\@="
syn match       vxNameCreation      "\(\(class\|func\) *\)\@<=\<[a-zA-Z]\w*\>"
syn match       vxNameCreation      "\(\(import\)  *\)\@<=\<[a-zA-Z]\w*\>\( *from\)\@="
syn match       vxNameCreation      "\(import  *[\w@.]\w*\/\(\w\w*\/\)*\)\@<=\<[a-zA-Z]\w*\>\(\.vx\)\@="
syn match       vxNameCreation      "\<[a-zA-Z]\w*\>\(: \)\@="
hi def link     vxNameCreation      Define

" Integers
syn match       vxDecimalInt        "\<\d\+\([Ee]\d\+\)\?"
syn match       vxHexadecimalInt    "\<0x\x\+"
syn match       vxOctalInt          "\<0\o\+"
syn match       vxOctalError        "\<0\o*[89]\d*"

hi def link     vxDecimalInt        Number
hi def link     vxHexadecimalInt    Number
hi def link     vxOctalInt          Number
hi def link     vxOctalError        Error

" Floating point
syn match       vxFloat             "\<\d\+\.\d*\([Ee][-+]\d\+\)\?\>"
syn match       vxFloat             "\<\.\d\+\([Ee][-+]\d\+\)\?\>"
syn match       vxFloat             "\<\d\+[Ee][-+]\d\+\>"

hi def link     vxFloat             Float

" Space-tab error
syn match vxSpaceError display " \+\t"me=e-1

" Trailing white space error
syn match vxSpaceError display excludenl "\s\+$"

hi def link     vxSpaceError        Error

" Search backwards for a global declaration to start processing the syntax.
"syn sync match goSync grouphere NONE /^\(const\|var\|type\|func\)\>/

" There's a bug in the implementation of grouphere. For now, use the
" following as a more expensive/less precise workaround.
syn sync minlines=500

let b:current_syntax = 'vx'

" vim: sw=2 sts=2 et

if g:colors_name == 'dracula'
  hi! link Function DraculaOrange
  hi! link Define DraculaGreen
endif
