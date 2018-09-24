/* description: Parses the vault language and generates the syntax tree. */

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
[a-zA-Z]\w*           return 'IDENTIFIER'
";"                   return ';'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
["][^"]*["]           return 'STRING'
['][^']*[']           return 'STRING'
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
%left ':'
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
%left '!' '~' PREFIX POSTFIX UMINUS UPLUS '++' '--'
%left '(' ')' '[' ']' '.'

%start program

%% /* language grammar */

program
    : statements EOF
        { console.log(require('util').inspect($1, { depth: Number(process.env.DEPTH) || 10, colors: require('tty').isatty(1) })); }
    ;

statements
    :
        {$$ = []}
    | statements statement
        {$$ = [...$1, $2]}
    ;

statement
    /* TODO: Expressions maybe shouldn't be valid... introduce assignment
       statements?
    */
    : e ';'
        {$$ = { t: 'e', v: $1 }}
    | RETURN e ';'
        {$$ = { t: 'return', v: $2 }}
    | BREAK ';'
        {$$ = { t: 'break' }}
    | CONTINUE ';'
        {$$ = { t: 'continue' }}
    | if
        {$$ = $1}
    | for
        {$$ = $1}
    | import ';'
        {$$ = $1}
    ;

if
    : IF '(' e ')' block
        {$$ = { t: 'if', v: [$3, $5.v] }}
    ;

for
    : FOR block
        {$$ = { t: 'for', v: [['loop'], $2.v] }}
    | FOR '(' e ')' block
        {$$ = { t: 'for', v: [['condition', $3], $5.v] }}
    | FOR '(' IDENTIFIER OF e ')' block
        {$$ = { t: 'for', v: [['of', $3, $5], $7.v] }}
    | FOR '(' e ';' e ';' e ')' block
        {$$ = { t: 'for', v: [['traditional', $3, $5, $7], $9.v] }}
    ;

string
    : STRING
        {$$ = { t: 'STRING', v: $1 }}
    ;

import
    : IMPORT IDENTIFIER
        {$$ = { t: 'import', v: [$2] }}
    | IMPORT IDENTIFIER FROM string
        {$$ = { t: 'import', v: [$2, $4] }}
    ;

func
    : FUNC funcName '(' params ')' block
        {$$ = { t: 'func', v: [$2, $4.map(p => p.v), $6] }}
    | FUNC funcName '(' params ')' '=>' e %prec FUNC
        {$$ = { t: 'func', v: [$2, $4.map(p => p.v), { t: 'expBody', v: $7 }] }}
    ;

funcName
    :
        {$$ = null}
    | IDENTIFIER
        {$$ = $1}
    ;

/* TODO: Check trailing commas for params */
params
    :
        {$$ = []}
    | nonEmptyParams
        {$$ = $1}
    ;

nonEmptyParams
    : param
        {$$ = [$1]}
    | nonEmptyParams ',' param
        {$$ = [...$1, $3]}
    ;

param
    : IDENTIFIER
        {$$ = { t: 'param', v: [$1, null] }}
    | IDENTIFIER ':' IDENTIFIER
        {$$ = { t: 'param', v: [$1, $3] }}
    ;

block
    : '{' statements '}'
        {$$ = { t: 'block', v: $2 }}
    ;

e
    : e '**' e
        {$$ = { t: '**', v: [$1, $3] }}
    | e ':=' e
        {$$ = { t: ':=', v: [$1, $3] }}
    | '++' e %prec PREFIX
        {$$ = { t: 'prefix ++', v: $2 }}
    | '--' e %prec PREFIX
        {$$ = { t: 'prefix --', v: $2 }}
    | e '++' %prec POSTFIX
        {$$ = { t: 'postfix ++', v: $1 }}
    | e '--' %prec POSTFIX
        {$$ = { t: 'postfix --', v: $1 }}
    | e '<<' e
        {$$ = { t: '<<', v: [$1, $3] }}
    | e '>>' e
        {$$ = { t: '>>', v: [$1, $3] }}
    | e '<=' e
        {$$ = { t: '<=', v: [$1, $3] }}
    | e '>=' e
        {$$ = { t: '>=', v: [$1, $3] }}
    | e '==' e
        {$$ = { t: '==', v: [$1, $3] }}
    | e '!=' e
        {$$ = { t: '!=', v: [$1, $3] }}
    | e '&&' e
        {$$ = { t: '&&', v: [$1, $3] }}
    | e '||' e
        {$$ = { t: '||', v: [$1, $3] }}
    | e '+=' e
        {$$ = { t: '+=', v: [$1, $3] }}
    | e '-=' e
        {$$ = { t: '-=', v: [$1, $3] }}
    | e '*=' e
        {$$ = { t: '*=', v: [$1, $3] }}
    | e '/=' e
        {$$ = { t: '/=', v: [$1, $3] }}
    | e '%=' e
        {$$ = { t: '%=', v: [$1, $3] }}
    | e '<<=' e
        {$$ = { t: '<<=', v: [$1, $3] }}
    | e '>>=' e
        {$$ = { t: '>>=', v: [$1, $3] }}
    | e '&=' e
        {$$ = { t: '&=', v: [$1, $3] }}
    | e '^=' e
        {$$ = { t: '^=', v: [$1, $3] }}
    | e '|=' e
        {$$ = { t: '|=', v: [$1, $3] }}
    | e '*' e
        {$$ = { t: '*', v: [$1, $3] }}
    | e '/' e
        {$$ = { t: '/', v: [$1, $3] }}
    | e '%' e
        {$$ = { t: '%', v: [$1, $3] }}
    | e '-' e
        {$$ = { t: '-', v: [$1, $3] }}
    | e '+' e
        {$$ = { t: '+', v: [$1, $3] }}
    | e '=' e
        {$$ = { t: '=', v: [$1, $3] }}
    | e '!' e
        {$$ = { t: '!', v: [$1, $3] }}
    | e '~' e
        {$$ = { t: '~', v: [$1, $3] }}
    | e '<' e
        {$$ = { t: '<', v: [$1, $3] }}
    | e '>' e
        {$$ = { t: '>', v: [$1, $3] }}
    | e '&' e
        {$$ = { t: '&', v: [$1, $3] }}
    | e '^' e
        {$$ = { t: '^', v: [$1, $3] }}
    | e '|' e
        {$$ = { t: '|', v: [$1, $3] }}
    | '-' e %prec UMINUS
        {$$ = { t: 'unary -', v: $2 }}
    | '+' e %prec UPLUS
        {$$ = { t: 'unary +', v: $2 }}
    | e '.' IDENTIFIER
        {$$ = { t: '.', v: [$1, $3] }}
    | '(' e ')'
        {$$ = $2;}
    | e '(' eList ')'
        {$$ = { t: 'functionCall', v: [$1, $3] }}
    | e ':' IDENTIFIER '(' eList ')'
        {$$ = { t: 'methodCall', v: [$1, $3, $5] }}
    | e '[' e ']'
        {$$ = { t: 'subscript', v: [$1, $3] }}
    | NUMBER
        {$$ = { t: 'NUMBER', v: $1 }}
    | IDENTIFIER
        {$$ = { t: 'IDENTIFIER', v: $1 }}
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

atomicExp
    : NUMBER
        {$$ = $1}
    | IDENTIFIER
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
        {$$ = { t: 'array', v: $2 }}
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
        {$$ = { t: 'object', v: $2 }}
    | '{' propListNonEmpty ',' '}'
        {$$ = { t: 'object', v: $2 }}
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
    : IDENTIFIER ':' e
        {$$ = [$1, $3]}
    ;

class
    : CLASS IDENTIFIER '{' classMembers classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['members', $4], methods: $5 } }}
    | CLASS IDENTIFIER classType '{' classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['whole', $3], methods: $5 } }}
    ;

/* TODO: proper type parsing (just IDENTIFIER right now) */
classType
    : ':' IDENTIFIER
        {$$ = $2}
    ;

classMembers
    :
        {$$ = []}
    | classMembers classMember
        {$$ = [...$1, $2]}
    ;

classMember
    : IDENTIFIER ':' IDENTIFIER ';'
        {$$ = [$1, $3]}
    ;

classMethods
    :
        {$$ = []}
    | classMethods classMethod
        {$$ = [...$1, $2]}
    ;

classMethod
    : classMethodModifiers ':' IDENTIFIER '(' params ')' classMethodBody
        {$$ = { modifiers: $1, name: $3, args: $5, body: $7 }}
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
        {$$ = { t: 'expBody', v: $2 }}
    ;

switch
    : SWITCH switchValueClause '{' switchCases '}'
        {$$ = { t: 'switch', v: [$2, $4] }}
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
