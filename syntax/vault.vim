" Vim syntax file
" Language:	vault
" Current Maintainer: Andrew Morris <voltrevo@gmail.com>
" Last Change:	2018 Sep 20

" Quit when a (custom) syntax file was already loaded
if exists('b:current_syntax')
  finish
endif

syn case match

syn keyword     vltDirective         import from of
syn keyword     vltDeclType          class
syn keyword     vltDeclaration       func static

hi def link     vltDirective         Statement
hi def link     vltDeclType          Keyword
hi def link     vltDeclaration       Keyword

" Keywords within functions
syn keyword     vltStatement         return break continue
syn keyword     vltConditional       if else switch match
syn keyword     vltRepeat            for

hi def link     vltStatement         Statement
hi def link     vltConditional       Conditional
hi def link     vltRepeat            Repeat

" Predefined types
syn keyword     vltType              bool string
syn keyword     vltSignedInts        i32 i64
syn keyword     vltUnsignedInts      byte u32 u64
syn keyword     vltFloats            f32 f64

hi def link     vltType              Type
hi def link     vltSignedInts        Type
hi def link     vltUnsignedInts      Type
hi def link     vltFloats            Type

" Predefined functions and values
syn keyword     vltConstants         true false null
hi def link     vltConstants         Constant

" Comments; their contents
syn keyword     vltTodo              contained TODO FIXME XXX BUG
syn cluster     vltCommentGroup      contains=vltTodo
syn region      vltComment           start="/\*" end="\*/" contains=@vltCommentGroup,@Spell
syn region      vltComment           start="//" end="$" contains=@vltCommentGroup,@Spell

hi def link     vltComment           Comment
hi def link     vltTodo              Todo

" vlt escapes
" TODO
" syn match       vltEscapeOctal       display contained "\\[0-7]\{3}"
syn match       vltEscapeC           display contained +\\[abfnrtv\\'"]+
" syn match       vltEscapeX           display contained "\\x\x\{2}"
" syn match       vltEscapeU           display contained "\\u\x\{4}"
" syn match       vltEscapeBigU        display contained "\\U\x\{8}"
" syn match       vltEscapeError       display contained +\\[^0-7xuUabfnrtv\\'"]+
"
" hi def link     vltEscapeOctal       vltSpecialString
hi def link     vltEscapeC           vltSpecialString
" hi def link     vltEscapeX           vltSpecialString
" hi def link     vltEscapeU           vltSpecialString
" hi def link     vltEscapeBigU        vltSpecialString
" hi def link     vltSpecialString     Special
" hi def link     vltEscapeError       Error

" Strings and their contents
syn cluster     vltStringGroup       contains=vltEscapeC
" syn cluster     vltStringGroup       contains=vltEscapeOctal,vltEscapeC,vltEscapeX,vltEscapeU,vltEscapeBigU,vltEscapeError
syn region      vltString            start=+'+ skip=+\\\\\|\\"+ end=+'+ contains=@vltStringGroup
" syn region      vltRawString         start=+`+ end=+`+

hi def link     vltString            String
" hi def link     vltRawString         String

" Regions
syn region      vltBlock             start="{" end="}" transparent fold
syn region      vltParen             start='(' end=')' transparent

" Functions
syn match       vltMethod            "\(:\)\@<=\<[a-zA-Z]\w*\>"
hi def link     vltMethod            Function

" Operators
syn match       vltOperator          "\(^\|[a-zA-Z0-9; ()]\)\@<=\(=>\|:=\|++\|--\|in\|delete\|\(+\|-\|\*\*\?\|\/\|%\|\^\|||\?\|&&\?\|=\|!\|<<\?\|>>\?\|\~\)=\?\)\($\|[a-zA-Z0-9; ()]\)\@="
hi def link     vltOperator          Operator

" Name creation
syn match       vltNameCreation      "\<\([a-zA-Z]\w*\)\>\( *\(:=\|of\)\)\@="
syn match       vltNameCreation      "\(\(import\|class\|func\) *\)\@<=\<[a-zA-Z]\w*\>"
syn match       vltNameCreation      "\<[a-zA-Z]\w*\>\(: \)\@="
hi def link     vltNameCreation      Define

" Integers
syn match       vltDecimalInt        "\<\d\+\([Ee]\d\+\)\?\>"
syn match       vltHexadecimalInt    "\<0x\x\+\>"
syn match       vltOctalInt          "\<0\o\+\>"
syn match       vltOctalError        "\<0\o*[89]\d*\>"

hi def link     vltDecimalInt        Number
hi def link     vltHexadecimalInt    Number
hi def link     vltOctalInt          Number
hi def link     vltOctalError        Error

" Floating point
syn match       vltFloat             "\<\d\+\.\d*\([Ee][-+]\d\+\)\?\>"
syn match       vltFloat             "\<\.\d\+\([Ee][-+]\d\+\)\?\>"
syn match       vltFloat             "\<\d\+[Ee][-+]\d\+\>"

hi def link     vltFloat             Float

" Space-tab error
syn match vltSpaceError display " \+\t"me=e-1

" Trailing white space error
syn match vltSpaceError display excludenl "\s\+$"

hi def link     vltSpaceError        Error

" Search backwards for a global declaration to start processing the syntax.
"syn sync match goSync grouphere NONE /^\(const\|var\|type\|func\)\>/

" There's a bug in the implementation of grouphere. For now, use the
" following as a more expensive/less precise workaround.
syn sync minlines=500

let b:current_syntax = 'vlt'

" vim: sw=2 sts=2 et

if g:colors_name == 'dracula'
  hi! link Function DraculaOrange
  hi! link Define DraculaGreen
endif
