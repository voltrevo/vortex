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
    : programStatements EOF
        {if (process.env.PRINT) { console.log(JSON.stringify($1, null, 2)); } else { return $1 }}
    ;

programStatements
    : statements
        {$$ = { t: 'block', v: $1, p: @$ }}
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
        {$$ = { t: 'e', v: { ...$1, topExp: true }, p: @$ }}
    | RETURN e ';'
        {$$ = { t: 'return', v: $2, p: @$ }}
    | BREAK ';'
        {$$ = { t: 'break', p: @$ }}
    | CONTINUE ';'
        {$$ = { t: 'continue', p: @$ }}
    | if
        {$$ = $1}
    | for
        {$$ = $1}
    | import ';'
        {$$ = $1}
    ;

if
    : IF '(' e ')' block
        {$$ = { t: 'if', v: [$3, $5], p: @$ }}
    ;

for
    : FOR block
        {$$ = { t: 'for', v: [['loop'], $2], p: @$ }}
    | FOR '(' e ')' block
        {$$ = { t: 'for', v: [['condition', $3], $5], p: @$ }}
    | FOR '(' identifier OF e ')' block
        {$$ = { t: 'for', v: [['of', $3, $5], $7], p: @$ }}
    | FOR '(' e ';' e ';' e ')' block
        {$$ = { t: 'for', v: [['traditional', $3, $5, $7], $9], p: @$ }}
    ;

string
    : STRING
        {$$ = { t: 'STRING', v: $1, p: @$ }}
    ;

import
    : IMPORT identifier
        {$$ = { t: 'import', v: [$2], p: @$ }}
    | IMPORT identifier FROM string
        {$$ = { t: 'import', v: [$2, $4], p: @$ }}
    ;

func
    : FUNC funcName '(' args ')' block
        {$$ = { t: 'func', v: [$2, $4, $6], p: @$ }}
    | FUNC funcName '(' args ')' '=>' e %prec FUNC
        {$$ = { t: 'func', v: [$2, $4, { t: 'expBody', v: $7, p: @7 }], p: @$ }}
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
        {$$ = { t: 'arg', v: [$1, null], p: @$ }}
    | identifier ':' identifier
        {$$ = { t: 'arg', v: [$1, $3], p: @$ }}
    ;

block
    : '{' statements '}'
        {$$ = { t: 'block', v: $2, p: @$ }}
    ;

e
    : e '**' e
        {$$ = { t: '**', v: [$1, $3], p: @$ }}
    | e ':=' e
        {$$ = { t: ':=', v: [$1, $3], p: @$ }}
    | '++' e %prec PREFIX
        {$$ = { t: 'prefix ++', v: $2, p: @$ }}
    | '--' e %prec PREFIX
        {$$ = { t: 'prefix --', v: $2, p: @$ }}
    | e '++' %prec POSTFIX
        {$$ = { t: 'postfix ++', v: $1, p: @$ }}
    | e '--' %prec POSTFIX
        {$$ = { t: 'postfix --', v: $1, p: @$ }}
    | e '<<' e
        {$$ = { t: '<<', v: [$1, $3], p: @$ }}
    | e '>>' e
        {$$ = { t: '>>', v: [$1, $3], p: @$ }}
    | e '<=' e
        {$$ = { t: '<=', v: [$1, $3], p: @$ }}
    | e '>=' e
        {$$ = { t: '>=', v: [$1, $3], p: @$ }}
    | e '==' e
        {$$ = { t: '==', v: [$1, $3], p: @$ }}
    | e '!=' e
        {$$ = { t: '!=', v: [$1, $3], p: @$ }}
    | e '&&' e
        {$$ = { t: '&&', v: [$1, $3], p: @$ }}
    | e '||' e
        {$$ = { t: '||', v: [$1, $3], p: @$ }}
    | e '+=' e
        {$$ = { t: '+=', v: [$1, $3], p: @$ }}
    | e '-=' e
        {$$ = { t: '-=', v: [$1, $3], p: @$ }}
    | e '*=' e
        {$$ = { t: '*=', v: [$1, $3], p: @$ }}
    | e '/=' e
        {$$ = { t: '/=', v: [$1, $3], p: @$ }}
    | e '%=' e
        {$$ = { t: '%=', v: [$1, $3], p: @$ }}
    | e '<<=' e
        {$$ = { t: '<<=', v: [$1, $3], p: @$ }}
    | e '>>=' e
        {$$ = { t: '>>=', v: [$1, $3], p: @$ }}
    | e '&=' e
        {$$ = { t: '&=', v: [$1, $3], p: @$ }}
    | e '^=' e
        {$$ = { t: '^=', v: [$1, $3], p: @$ }}
    | e '|=' e
        {$$ = { t: '|=', v: [$1, $3], p: @$ }}
    | e '*' e
        {$$ = { t: '*', v: [$1, $3], p: @$ }}
    | e '/' e
        {$$ = { t: '/', v: [$1, $3], p: @$ }}
    | e '%' e
        {$$ = { t: '%', v: [$1, $3], p: @$ }}
    | e '-' e
        {$$ = { t: '-', v: [$1, $3], p: @$ }}
    | e '+' e
        {$$ = { t: '+', v: [$1, $3], p: @$ }}
    | e '=' e
        {$$ = { t: '=', v: [$1, $3], p: @$ }}
    | e '!' e
        {$$ = { t: '!', v: [$1, $3], p: @$ }}
    | e '~' e
        {$$ = { t: '~', v: [$1, $3], p: @$ }}
    | e '<' e
        {$$ = { t: '<', v: [$1, $3], p: @$ }}
    | e '>' e
        {$$ = { t: '>', v: [$1, $3], p: @$ }}
    | e '&' e
        {$$ = { t: '&', v: [$1, $3], p: @$ }}
    | e '^' e
        {$$ = { t: '^', v: [$1, $3], p: @$ }}
    | e '|' e
        {$$ = { t: '|', v: [$1, $3], p: @$ }}
    | '-' e %prec UMINUS
        {$$ = { t: 'unary -', v: $2, p: @$ }}
    | '+' e %prec UPLUS
        {$$ = { t: 'unary +', v: $2, p: @$ }}
    | e '.' identifier
        {$$ = { t: '.', v: [$1, $3], p: @$ }}
    | '(' e ')'
        {$$ = $2;}
    | e '(' eList ')'
        {$$ = { t: 'functionCall', v: [$1, $3], p: @$ }}
    | e ':' identifier '(' eList ')'
        {$$ = { t: 'methodCall', v: [$1, $3, $5], p: @$ }}
    | e '[' e ']'
        {$$ = { t: 'subscript', v: [$1, $3], p: @$ }}
    | NUMBER
        {$$ = { t: 'NUMBER', v: $1, p: @$ }}
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
        {$$ = { t: 'IDENTIFIER', v: $1, p: @$ }}
    ;

atomicExp
    : NUMBER
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
        {$$ = { t: 'array', v: $2, p: @$ }}
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
        {$$ = { t: 'object', v: $2, p: @$ }}
    | '{' propListNonEmpty ',' '}'
        {$$ = { t: 'object', v: $2, p: @$ }}
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
    ;

class
    : CLASS identifier '{' classMembers classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['members', $4], methods: $5 }, p: @$ }}
    | CLASS identifier classType '{' classMethods '}'
        {$$ = { t: 'class', v: { name: $2, type: ['whole', $3], methods: $5 }, p: @$ }}
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
        {$$ = { modifiers: $1, name: $3, args: $5, body: $7, p: @$ }}
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
        {$$ = { t: 'expBody', v: $2, p: @$ }}
    ;

switch
    : SWITCH switchValueClause '{' switchCases '}'
        {$$ = { t: 'switch', v: [$2, $4], p: @$ }}
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
