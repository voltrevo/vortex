" Author: Andrew Morris <voltrevo@gmail.com>
" Description: check vortex files, based on rust ale_linter

function! ale_linters#vortex#check#HandleErrors(buffer, lines) abort
    let l:output = []

    for l:errorline in a:lines
        " ignore lines that are not json
        if l:errorline !~# '^{'
            continue
        endif

        " 'lnum': l:span.line_start,
        " 'end_lnum': l:span.line_end,
        " 'col': l:span.column_start,
        " 'end_col': l:span.column_end,
        " 'text': l:error.message,
        " 'type': toupper(l:error.level[0]),
        call add(l:output, json_decode(l:errorline))
    endfor

    return l:output
endfunction

function! ale_linters#vortex#check#CheckCommand(buffer) abort
  return 'vortex-check'
endfunction

call ale#linter#Define('vortex', {
\   'name': 'vortex-check',
\   'executable': 'vortex-check',
\   'command_callback': 'ale_linters#vortex#check#CheckCommand',
\   'callback': 'ale_linters#vortex#check#HandleErrors',
\   'output_stream': 'stderr',
\})
