/* description: Parses vortex assembly and generates the syntax tree. */

/* lexical grammar */
%lex
%%

"//".*                /* skip line comments */
[/][*][^*]*[*]+([^/*][^*]*[*]+)*[/]   /* skip block comments */
\s+                   /* skip whitespace */
'get'                 return 'GET'
'set'                 return 'SET'
'gcall'               return 'GCALL'
'mcall'               return 'MCALL'
'hoist'               return 'HOIST'
\$[^\s]+              return 'NLABEL'
'if'                  return 'IF'
'else'                return 'ELSE'
'loop'                return 'LOOP'
'func'                return 'FUNC'
'gfunc'               return 'GFUNC'
'mfunc'               return 'MFUNC'
'false'               return 'FALSE'
'true'                return 'TRUE'
'null'                return 'NULL'
'{'                   return '{'
'}'                   return '}'
'['                   return '['
']'                   return ']'
','                   return ','
':'                   return ':'
"#["                  return 'SETSTART'
[!%^&*\-+<>=/\.|~]+   return 'OPERATOR'
[0-9]+("."[0-9]+)?([uif][0-9]*)?\b  return 'NUMBER'
[a-zA-Z]\w*           return 'IDENTIFIER'
['](\\.|[^'])*[']     return 'STRING'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */
/* (doesn't seem to be needed)          */

%start program

%% /* language grammar */

program
    : setGlobals block unsetGlobals EOF
        {if (process.env.PRINT) { console.log(JSON.stringify($2, null, 2)); } else { return $2 }}
    ;

setGlobals
    :
        {global.L = ({first_line, last_line, first_column, last_column}) => ['<file>', [[first_line, first_column + 1], [last_line, last_column]]];}
    ;

unsetGlobals
    :
        {delete global.L;}
    ;

block
    : statements
        {$$ = { t: 'block', v: $1, p: L(@$) }}
    ;

statements
    :
        {$$ = []}
    | statements statement
        {$$ = [...$1, $2]}
    ;

statement
    : labelWord NLABEL
        {$$ = { t: $1.toLowerCase(), v: $2, p: L(@$) }}
    | func
        {$$ = $1}
    | gfunc
        {$$ = $1}
    | mfunc
        {$$ = $1}
    | if
        {$$ = $1}
    | loop
        {$$ = $1}
    | IDENTIFIER
        {$$ = { t: 'word', v: $1, p: L(@$) }}
    | OPERATOR
        {$$ = { t: 'word', v: $1, p: L(@$) }}
    | ':'
        {$$ = { t: 'word', v: $1, p: L(@$) }}
    | value
        {$$ = $1}
    ;

labelWord
    : GET
        {$$ = $1}
    | SET
        {$$ = $1}
    | GCALL
        {$$ = $1}
    | MCALL
        {$$ = $1}
    | HOIST
        {$$ = $1}
    ;

value
    : NULL
        {$$ = { t: 'null', v: null, p: L(@$) }}
    | FALSE
        {$$ = { t: 'bool', v: false, p: L(@$) }}
    | TRUE
        {$$ = { t: 'bool', v: true, p: L(@$) }}
    | number
        {$$ = $1}
    | string
        {$$ = $1}
    | array
        {$$ = $1}
    | set
        {$$ = $1}
    | object
        {$$ = $1}
    ;

string
    : STRING
        {$$ = { t: 'string', v: $1, p: L(@$) }}
    ;

func
    : FUNC '{' block '}'
        {$$ = { t: 'func', v: $3, p: L(@$) }}
    ;

gfunc
    : GFUNC NLABEL '{' block '}'
        {$$ = { t: 'gfunc', v: { nlabel: $2, block: $4 }, p: L(@$) }}
    ;

mfunc
    : MFUNC NLABEL '{' block '}'
        {$$ = { t: 'mfunc', v: { nlabel: $2, block: $4 }, p: L(@$) }}
    ;

number
    : NUMBER
        {$$ = { t: 'number', v: $1, p: L(@$) }}
    ;

array
    : '[' vList ']'
        {$$ = { t: 'array', v: $2, p: L(@$) }}
    ;

set
    : SETSTART vList ']'
        {$$ = { t: 'set_', v: $2, p: L(@$) }}
    ;

vList
    :
        {$$ = []}
    | vListA
        {$$ = $1}
    | vListB
        {$$ = $1}
    ;

vListA
    : value
        {$$ = [$1]}
    | vListB value
        {$$ = [...$1, $2]}
    ;

vListB
    : vListA ','
        {$$ = $1}
    ;

object
    : '{' propList '}'
        {$$ = { t: 'object', v: $2, p: L(@$) }}
    | '{' propListNonEmpty ',' '}'
        {$$ = { t: 'object', v: $2, p: L(@$) }}
    ;

propList
    :
        {$$ = []}
    | propListNonEmpty
        {$$ = $1}
    ;

propListNonEmpty
    : prop
        {$$ = [$1]}
    | propListNonEmpty ',' prop
        {$$ = [...$1, $3]}
    ;

prop
    : value ':' value
        {$$ = [$1, $3]}
    | identifier ':' value
        {$$ = [{ t: 'string', v: '\'' + $1.v + '\'', p: $1.p }, $3]}
    ;

identifier
    : IDENTIFIER
        {$$ = { t: 'identifier', v: $1, p: L(@$) }}
    ;

if
    : IF '{' block '}'
        {$$ = { t: 'if', v: { block: $3, elseBlock: null }, p: L(@$) }}
    | IF '{' block '}' ELSE '{' block '}'
        {$$ = { t: 'if', v: { block: $3, elseBlock: $7 }, p: L(@$) }}
    ;

loop
    : LOOP '{' block '}'
        {$$ = { t: 'loop', v: $3, p: L(@$) }}
    ;
