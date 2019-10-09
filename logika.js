function Operator( text, arity, java, p ) {
	this.text = text;
	this.arity = arity;
	this.java = java || text;
	this.priority = p;
}


var precedence = [
  { dir: -1, ops: [ new Operator('not', 1, '\u00ac', 4)] },
  { dir: +1, ops: [ new Operator('or', 2,  '\u02c5', 3),
                    new Operator('and', 2, '\u02c4', 3) ] },
  { dir: +1, ops: [ new Operator('implies', 2, '\u2283', 1) ] }
];


function mainOp( tokens ) {
	var next = null;
	var tx;
	for ( var i = 0; next == null && i < precedence.length; i++ ) {
		var p = precedence[i];
		var j = 0;
		while ( j < tokens.length && next == null ) {
			tx = (p.dir==1) ? j : tokens.length-1-j;
			var ox = 0;
			while ( ox < p.ops.length && tokens[tx] != p.ops[ox].text )
				ox++;
			if ( ox < p.ops.length )
				next = p.ops[ox];
			j++;
		}
	}
	return next == null ? null : { tx: tx, op: next };
}

function tree( tokens ) {
	while ( true ) {
		var bs = -1, es = -1;
		for ( var i = 0; es == -1 && i < tokens.length; i++ ) {
			if ( "(" == tokens[i] )
					bs = i;
			if ( ")" == tokens[i] ) {
					es = i;
					break;
			}
		}
		if ( es == -1 )
			break;
		if ( (bs == -1) != (es == -1) )
			return null;

		var temp = new Array();
		for ( var i = bs+1; i < es; i++ )
			temp.push( tokens[i] );
		var res = tree(temp);
		if ( res == null )
			return res;

		temp = new Array();
		for ( var i = 0; i < bs; i++ )
			temp.push( tokens[i] );
		temp.push( res );
		for ( var i = es+1; i < tokens.length; i++ )
			temp.push( tokens[i] );
		tokens = temp;
		//alert(tokens.length);
	}

	var main;
	while ( (main = mainOp(tokens)) != null ) {
		var temp = new Array();
		if ( main.op.arity == 1 ) {
			if ( main.tx+1 >= tokens.length )
				return null;
			for ( var i = 0; i < main.tx; i++ )
				temp.push( tokens[i] );
			temp.push( { op: main.op, arg1: tokens[main.tx+1] } );
			for ( var i = main.tx+2; i < tokens.length; i++ )
				temp.push( tokens[i] );
		} else if ( main.op.arity == 2 ) {
			if ( main.tx == 0 || main.tx+1 >= tokens.length )
				return null;
			for ( var i = 0; i < main.tx-1; i++ )
				temp.push( tokens[i] );
			temp.push( { op: main.op, arg1: tokens[main.tx-1], arg2: tokens[main.tx+1] } );
			for ( var i = main.tx+2; i < tokens.length; i++ )
				temp.push( tokens[i] );
		} else {
			if ( main.tx+2 >= tokens.length )
				return null;
			for ( var i = 0; i < main.tx; i++ )
				temp.push( tokens[i] );
			temp.push( new Quantifier( main.op.text, tokens[main.tx+1], tokens[main.tx+2] ) );
			for ( var i = main.tx+3; i < tokens.length; i++ )
				temp.push( tokens[i] );

		}
		tokens = temp;
	}
	return tokens.length == 1 ? tokens[0] : null;
}

var qi = 1;
function nextQI() {
	return "v"+(qi++);
}

function showtree(tree) {
	if ( tree == null )
		return null;

	if ( tree.op ) {
		if ( tree.op.arity == 1 ) {
			var arg = showtree(tree.arg1);
			return arg == null ? null : { dec: arg.dec, exp: "("+tree.op.java + " " + arg.exp+")" };
		} else
			var arg1 = showtree(tree.arg1);
			var arg2 = showtree(tree.arg2);
			if (arg1 == null || arg2 == null )
				return null;
			var o = { implies: "||", or:"||", and:"&&" };
			return { dec: arg1.dec+arg2.dec, exp: "("+(tree.op.text=="implies"?"!":"")+arg1.exp + " " + tree.op.java + " " + arg2.exp+")" };
	} else {
		return { dec: "", exp: tree };
	}
}


function toAbbrevated( formula, priority ) {
	if ( priority == undefined )
		priority = 0;
	if ( formula == null )
		return null;

	var tree = formula;
	if ( tree.op ) {
		var op = tree.op;
		var prefix = "", suffix = "";
		if (  op.priority <= priority && !( op.priority == 4 && priority == 4 )  ) {
			prefix = "(";
			suffix = ")";
		} else {
		}
		if ( op.arity == 1 )
			return prefix+ tree.op.java + toAbbrevated(tree.arg1, op.priority) + suffix;
		else
			return prefix + toAbbrevated(tree.arg1, op.priority) +" "+ tree.op.java +" "+ toAbbrevated(tree.arg2, op.priority) + suffix;
	} else {
		return tree;
	}
}



function indent(sourceText) {
	var lines = sourceText.split("\n");
	var result = new Array();
	var ind = 0;
	for ( var i = 0; i < lines.length; i++ )
		if ( lines[i] != "" ) {
			var cline = lines[i];
			for ( var j = 0; j < cline.length; j++ )
				if ( cline.charAt(j) == '}' )
					ind--;
			for ( var j = ind; j > 0; j-- )
				cline = "    "+cline;
			result.push(cline);
			for ( var j = 0; j < cline.length; j++ )
				if ( cline.charAt(j) == '{' )
					ind++;
		}
	return result.join("\n");
}


function st(tree) {
	qi=1;
	v = showtree(tree);
	return (v == null)
        ? "A megadott kifejezés nem lehet formula"
        : indent( v.dec + "\nreturn " + v.exp + ";");
}

function Quantifier(text,variable,formula) {
	this.text = text;
	this.variable = variable;
	this.formula = formula;
};


function tokenize( str ) {
	var tokens = new Array();

	var wspaces = " \t";
	var delims = "()+-*/><=";

	var i = 0, block = 0;
	str += " ";
	for ( var j = 0; j < str.length; j++ ) {
		var c = str.charAt(j);
		if ( delims.indexOf(c) > -1 ) {
			if ( i < j )
				tokens.push( str.substr(i,j-i) );
			tokens.push(c);
			i=j+1;
		} else if ( wspaces.indexOf(c) > -1 ) {
			if ( i < j )
				tokens.push( str.substr(i,j-i) );
			i=j+1;
		}
	}

	return tokens;
}


function getDegree(formula) {
	if ( formula.op )
		return formula.op.arity == 1 ? getDegree(formula.arg1)+1 : getDegree(formula.arg1) + getDegree(formula.arg2)+1;
	else
		return 0;

}

function getImmediate(formula) {
	var r = new Array();
	if ( formula.op ) {
		 r.push( toAbbrevated(formula.arg1) )
		 if ( formula.op.arity > 1 )
			 r.push( toAbbrevated(formula.arg2) )
	}
	return r;
}

function getSubformulaSet(formula, result) {
	result = result || {};
	result[new String(toAbbrevated(formula))]=1;
	if ( formula.op )  {
		getSubformulaSet(formula.arg1, result)
		 if ( formula.op.arity > 1 )
			 getSubformulaSet(formula.arg2, result);
	}
	return result;
}



function setSuccess() {
    var input = document.forms[0].elements['input'];
    var success = document.createElement('span');
    success.setAttribute('class', 'glyphicon glyphicon-ok form-control-feedback');
    success.setAttribute('aria-hidden', true);

    input.parentNode.appendChild(success);
    input.parentNode.parentNode.setAttribute('has-feedback has-success');
}

function setError() {
    var err = document.createElement('span');
    err.setAttribute('class', 'glyphicon glyphicon-remove form-control-feedback');
    err.setAttribute('aria-hidden', true);
}

function getProperties(str) {
	var formula = tree(tokenize(str));

	if ( formula != null ) {
		document.forms[0].elements['output1'].value = toAbbrevated(formula);
		document.forms[0].elements['output2'].value = getDegree(formula);
		document.forms[0].elements['output3'].value = getImmediate(formula).join("; ");
		var o = getSubformulaSet(formula);
		var s = [];
		for (var i in o) {
			s.push(i);
		}
		document.forms[0].elements['output4'].value = s.join("; ");
		//document.forms[0].elements['output5'].value = st(tree(tokenize(str)));
        //
        window.setSuccess();
	} else {
		document.forms[0].elements['output1'].value = "";
		document.forms[0].elements['output2'].value = "";
		document.forms[0].elements['output3'].value = "";
		document.forms[0].elements['output4'].value = "";
		//document.forms[0].elements['output5'].value = "";
        window.setError();
	}
}

function toLatex(str) {

}
