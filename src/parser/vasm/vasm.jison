/* description: Parses vortex assembly and generates the syntax tree. */

/* lexical grammar */
%lex
%%

"//".*                /* skip line comments */
[/][*][^*]*[*]+([^/*][^*]*[*]+)*[/]   /* skip block comments */
\s+                   /* skip whitespace */
'get'                 return 'GET'
'set'                 return 'SET'
'call'                return 'CALL'
'gcall'               return 'GCALL'
\$[a-zA-Z]\w*         return 'NLABEL'
[a-zA-Z]\w*           return 'IDENTIFIER'
'if'                  return 'IF'
'else'                return 'ELSE'
'loop'                return 'LOOP'
'func'                return 'FUNC'
'gfunc'               return 'GFUNC'
'true'                return 'TRUE'
'false'               return 'FALSE'
'null'                return 'NULL'
'{'                   return '{'
'}'                   return '}'
'['                   return '['
']'                   return ']'
','                   return ','
':'                   return ':'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
'u'                   return 'u'
'i'                   return 'i'
'f'                   return 'f'
['](\\.|[^'])*[']     return 'STRING'
[^\s]+                return 'WORD'
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
    | IDENTIFIER
        {$$ = { t: 'word', v: $1, p: L(@$) }}
    | WORD
        {$$ = { t: 'word', v: $1, p: L(@$) }}
    | value
        {$$ = $1}
    | gfunc
        {$$ = $1}
    | if
        {$$ = $1}
    | loop
        {$$ = $1}
    ;

labelWord
    : GET
        {$$ = $1}
    | SET
        {$$ = $1}
    | CALL
        {$$ = $1}
    | GCALL
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
    | STRING
        {$$ = $1}
    | array
        {$$ = $1}
    | object
        {$$ = $1}
    | func
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
    : GFUNC '{' block '}'
        {$$ = { t: 'gfunc', v: $3, p: L(@$) }}
    ;

number
    : NUMBER numberSuffix
        {$$ = { t: 'number', v: [$1, $2], p: L(@$) }}
    ;

numberSuffix
    :
        {$$ = null}
    | 'u' NUMBER
        {$$ = $1 + $2}
    | 'i' NUMBER
        {$$ = $1 + $2}
    | 'f' NUMBER
        {$$ = $1 + $2}
    ;

array
    : '[' vList ']'
        {$$ = { t: 'array', v: $2, p: L(@$) }}
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
        {$$ = [$1, $3]}
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
        {$$ = { t: 'loop', v: { block: $3 }, p: L(@$) }}
    ;
