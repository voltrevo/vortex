/* description: Parses the vortex language and generates the syntax tree. */

/* lexical grammar */
%lex
%%

"//".*                /* skip line comments */
[/][*][^*]*[*]+([^/*][^*]*[*]+)*[/]   /* skip block comments */
\s+                   /* skip whitespace */
'{'                   return '{'
'}'                   return '}'
'if'                  return 'IF'
'for'                 return 'FOR'
'of'                  return 'OF'
'func'                return 'FUNC'
'return'              return 'RETURN'
'break'               return 'BREAK'
'continue'            return 'CONTINUE'
'import'              return 'IMPORT'
'from'                return 'FROM'
'class'               return 'CLASS'
'static'              return 'STATIC'
'switch'              return 'SWITCH'
'true'                return 'TRUE'
'false'               return 'FALSE'
'null'                return 'NULL'
'assert'              return 'ASSERT'
'breakpoint'          return 'BREAKPOINT'
[a-zA-Z]\w*           return 'IDENTIFIER'
";"                   return ';'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
['](\\.|[^'])*[']           return 'STRING'
'=>'                  return '=>'
"**"                  return '**'
":="                  return ':='
"++"                  return '++'
"--"                  return '--'
"<<"                  return '<<'
">>"                  return '>>'
"<="                  return '<='
">="                  return '>='
"=="                  return '=='
"!="                  return '!='
"&&"                  return '&&'
"||"                  return '||'
"+="                  return '+='
"-="                  return '-='
"*="                  return '*='
"/="                  return '/='
"%="                  return '%='
"<<="                 return '<<='
">>="                 return '>>='
"&="                  return '&='
"^="                  return '^='
"|="                  return '|='
"*"                   return '*'
"/"                   return '/'
'%'                   return '%'
"-"                   return '-'
"+"                   return '+'
"("                   return '('
")"                   return ')'
"="                   return '='
":"                   return ':'
","                   return ','
"!"                   return '!'
"~"                   return '~'
"<"                   return '<'
">"                   return '>'
"&"                   return '&'
"^"                   return '^'
"|"                   return '|'
'['                   return '['
']'                   return ']'
'.'                   return '.'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%right FUNC
%right ':=' '=' '+=' '-=' '*=' '/=' '%=' '<<=' '>>=' '&=' '|=' '^='
%left '||'
%left '&&'
%left '|'
%left '^'
%left '&'
%left '==' '!='
%left '<' '>' '>=' '<='
%left '<<' '>>'
%left '+' '-'
%left '*' '/' '%'
%right '**'
%left '!' '~' POSTFIX UMINUS UPLUS '++' '--'
%left '(' ')' '[' ']' '.' ':'

%start program

%% /* language grammar */

program
    : setGlobals programStatements unsetGlobals EOF
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

programStatements
    : statements
        {$$ = { t: 'block', v: $1, p: L(@$) }}
    ;

statements
    :
        {$$ = []}
    | statements statement
        {$$ = [...$1, $2]}
    ;

topExp
    : e
        {$$ = { ...$1, topExp: true }}
    ;

statement
    : topExp ';'
        {$$ = { t: 'e', v: $1, p: L(@$) }}
    | RETURN e ';'
        {$$ = { t: 'return', v: $2, p: L(@$) }}
    | BREAK ';'
        {$$ = { t: 'break', p: L(@$) }}
    | CONTINUE ';'
        {$$ = { t: 'continue', p: L(@$) }}
    | if
        {$$ = $1}
    | for
        {$$ = $1}
    | import ';'
        {$$ = { ...$1, topExp: true }}
    | ASSERT e ';'
        {$$ = { t: 'assert', v: $2, p: L(@$), topExp: true }}
    | BREAKPOINT ';'
        {$$ = { t: 'breakpoint', v: null, p: L(@$) }}
    ;

if
    : IF '(' e ')' block
        {$$ = { t: 'if', v: [$3, $5], p: L(@$) }}
    ;

for
    : FOR block
        {$$ = { t: 'for', v: { control: null, block: $2 }, p: L(@$) }}
    | FOR '(' e ')' block
        {$$ = { t: 'for', v: { control: { t: 'condition', v: $3 }, block: $5 }, p: L(@$) }}
    | FOR '(' identifier OF e ')' block
        {$$ = { t: 'for', v: { control: { t: 'range', v: [$3, $5] }, block: $7 }, p: L(@$) }}
    | FOR '(' topExp ';' e ';' topExp ')' block
        {$$ = { t: 'for', v: { control: { t: 'setup; condition; next', v: [$3, $5, $7] }, block: $9 }, p: L(@$) }}
    ;

string
    : STRING
        {$$ = { t: 'STRING', v: $1, p: L(@$) }}
    ;

import
    : IMPORT identifier
        {$$ = { t: 'import', v: [$2, null], p: L(@$) }}
    | IMPORT identifier FROM string
        {$$ = { t: 'import', v: [$2, $4], p: L(@$) }}
    ;

func
    : FUNC funcName '(' args ')' block
        {$$ = { t: 'Func', v: { name: $2, args: $4, body: $6 }, p: L(@$) }}
    | FUNC funcName '(' args ')' '=>' e %prec FUNC
        {$$ = { t: 'Func', v: { name: $2, args: $4, body: { t: 'expBody', v: $7, p: L(@7) } }, p: L(@$) }}
    ;

funcName
    :
        {$$ = null}
    | identifier
        {$$ = $1}
    ;

/* TODO: Check trailing commas for args */
args
    :
        {$$ = []}
    | nonEmptyArgs
        {$$ = $1}
    ;

nonEmptyArgs
    : arg
        {$$ = [$1]}
    | nonEmptyArgs ',' arg
        {$$ = [...$1, $3]}
    ;

arg
    : identifier
        {$$ = { t: 'arg', v: [$1, null], p: L(@$) }}
    | identifier ':' identifier
        {$$ = { t: 'arg', v: [$1, $3], p: L(@$) }}
    ;

block
    : '{' statements '}'
        {$$ = { t: 'block', v: $2, p: L(@$) }}
    ;

e
    : e '**' e
        {$$ = { t: '**', v: [$1, $3], p: L(@$) }}
    | e ':=' e
        {$$ = { t: ':=', v: [$1, $3], p: L(@$) }}
    | e '++' %prec POSTFIX
        {$$ = { t: '++', v: $1, p: L(@$) }}
    | e '--' %prec POSTFIX
        {$$ = { t: '--', v: $1, p: L(@$) }}
    | e '<<' e
        {$$ = { t: '<<', v: [$1, $3], p: L(@$) }}
    | e '>>' e
        {$$ = { t: '>>', v: [$1, $3], p: L(@$) }}
    | e '<=' e
        {$$ = { t: '<=', v: [$1, $3], p: L(@$) }}
    | e '>=' e
        {$$ = { t: '>=', v: [$1, $3], p: L(@$) }}
    | e '==' e
        {$$ = { t: '==', v: [$1, $3], p: L(@$) }}
    | e '!=' e
        {$$ = { t: '!=', v: [$1, $3], p: L(@$) }}
    | e '&&' e
        {$$ = { t: '&&', v: [$1, $3], p: L(@$) }}
    | e '||' e
        {$$ = { t: '||', v: [$1, $3], p: L(@$) }}
    | e '+=' e
        {$$ = { t: '+=', v: [$1, $3], p: L(@$) }}
    | e '-=' e
        {$$ = { t: '-=', v: [$1, $3], p: L(@$) }}
    | e '*=' e
        {$$ = { t: '*=', v: [$1, $3], p: L(@$) }}
    | e '/=' e
        {$$ = { t: '/=', v: [$1, $3], p: L(@$) }}
    | e '%=' e
        {$$ = { t: '%=', v: [$1, $3], p: L(@$) }}
    | e '<<=' e
        {$$ = { t: '<<=', v: [$1, $3], p: L(@$) }}
    | e '>>=' e
        {$$ = { t: '>>=', v: [$1, $3], p: L(@$) }}
    | e '&=' e
        {$$ = { t: '&=', v: [$1, $3], p: L(@$) }}
    | e '^=' e
        {$$ = { t: '^=', v: [$1, $3], p: L(@$) }}
    | e '|=' e
        {$$ = { t: '|=', v: [$1, $3], p: L(@$) }}
    | e '*' e
        {$$ = { t: '*', v: [$1, $3], p: L(@$) }}
    | e '/' e
        {$$ = { t: '/', v: [$1, $3], p: L(@$) }}
    | e '%' e
        {$$ = { t: '%', v: [$1, $3], p: L(@$) }}
    | e '-' e
        {$$ = { t: '-', v: [$1, $3], p: L(@$) }}
    | e '+' e
        {$$ = { t: '+', v: [$1, $3], p: L(@$) }}
    | e '=' e
        {$$ = { t: '=', v: [$1, $3], p: L(@$) }}
    | e '!' e
        {$$ = { t: '!', v: [$1, $3], p: L(@$) }}
    | e '~' e
        {$$ = { t: '~', v: [$1, $3], p: L(@$) }}
    | e '<' e
        {$$ = { t: '<', v: [$1, $3], p: L(@$) }}
    | e '>' e
        {$$ = { t: '>', v: [$1, $3], p: L(@$) }}
    | e '&' e
        {$$ = { t: '&', v: [$1, $3], p: L(@$) }}
    | e '^' e
        {$$ = { t: '^', v: [$1, $3], p: L(@$) }}
    | e '|' e
        {$$ = { t: '|', v: [$1, $3], p: L(@$) }}
    | '-' e %prec UMINUS
        {$$ = { t: 'unary -', v: $2, p: L(@$) }}
    | '+' e %prec UPLUS
        {$$ = { t: 'unary +', v: $2, p: L(@$) }}
    | e '.' identifier
        {$$ = { t: '.', v: [$1, $3], p: L(@$) }}
    | '(' e ')'
        {$$ = $2;}
    | e '(' eList ')'
        {$$ = { t: 'functionCall', v: [$1, $3], p: L(@$) }}
    | e ':' identifier
        {$$ = { t: 'methodLookup', v: [$1, $3], p: L(@$) }}
    | e '[' e ']'
        {$$ = { t: 'subscript', v: [$1, $3], p: L(@$) }}
    | number
        {$$ = $1}
    | bool
        {$$ = $1}
    | null
        {$$ = $1}
    | identifier
        {$$ = $1}
    | string
        {$$ = $1}
    | func
        {$$ = $1}
    | array
        {$$ = $1}
    | object
        {$$ = $1}
    | '(' import ')'
        {$$ = $2}
    | class
        {$$ = $1}
    | switch
        {$$ = $1}
    ;

identifier
    : IDENTIFIER
        {$$ = { t: 'IDENTIFIER', v: $1, p: L(@$) }}
    ;

bool
    : TRUE
        {$$ = { t: 'BOOL', v: true, p: L(@$) } }
    | FALSE
        {$$ = { t: 'BOOL', v: false, p: L(@$) } }
    ;

null
    : NULL
        {$$ = { t: 'NULL', v: null, p: L(@$) }}
    ;

number
    : NUMBER
        {$$ = { t: 'NUMBER', v: $1, p: L(@$) }}
    ;

atomicExp
    : number
        {$$ = $1}
    | bool
        {$$ = $1}
    | null
        {$$ = $1}
    | identifier
        {$$ = $1}
    | string
        {$$ = $1}
    | array
        {$$ = $1}
    | object
        {$$ = $1}
    | '(' import ')'
        {$$ = $2}
    | class
        {$$ = $1}
    | switch
        {$$ = $1}
    | '(' e ')'
        {$$ = $2}
    ;

array
    : '[' eList ']'
        {$$ = { t: 'Array', v: $2, p: L(@$) }}
    ;

eList
    :
        {$$ = []}
    | eListA
        {$$ = $1}
    | eListB
        {$$ = $1}
    ;

eListA
    : e
        {$$ = [$1]}
    | eListB e
        {$$ = [...$1, $2]}
    ;

eListB
    : eListA ','
        {$$ = $1}
    ;

object
    : '{' propList '}'
        {$$ = { t: 'Object', v: $2, p: L(@$) }}
    | '{' propListNonEmpty ',' '}'
        {$$ = { t: 'Object', v: $2, p: L(@$) }}
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
    : identifier ':' e
        {$$ = [$1, $3]}
    | string ':' e
        {$$ = [$1, $3]}
    | identifier
        {$$ = [$1, $1]}
    ;

class
    : CLASS identifier '{' classMembers classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['members', $4], methods: $5 }, p: L(@$) }}
    | CLASS identifier classType '{' classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['whole', $3], methods: $5 }, p: L(@$) }}
    ;

/* TODO: proper type parsing (just identifier right now) */
classType
    : ':' identifier
        {$$ = $2}
    ;

classMembers
    :
        {$$ = []}
    | classMembers classMember
        {$$ = [...$1, $2]}
    ;

classMember
    : identifier ':' identifier ';'
        {$$ = [$1, $3]}
    ;

classMethods
    :
        {$$ = []}
    | classMethods classMethod
        {$$ = [...$1, $2]}
    ;

classMethod
    : classMethodModifiers ':' identifier '(' args ')' classMethodBody
        {$$ = { modifiers: $1, name: $3, args: $5, body: $7, p: L(@$) }}
    ;

classMethodModifiers
    :
        {$$ = []}
    | STATIC
        {$$ = ['static']}
    ;

classMethodBody
    : block
        {$$ = $1}
    | '=>' e ';'
        {$$ = { t: 'expBody', v: $2, p: L(@$) }}
    ;

switch
    : SWITCH switchValueClause '{' switchCases '}'
        {$$ = { t: 'switch', v: [$2, $4], p: L(@$) }}
    ;

switchValueClause
    :
        {$$ = null}
    | '(' e ')'
        {$$ = $2}
    ;

switchCases
    :
        {$$ = []}
    | switchCases switchCase
        {$$ = [...$1, $2]}
    ;

switchCase
    : atomicExp '=>' e ';'
        {$$ = [$1, $3]}
    ;
