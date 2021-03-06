/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams
} from 'vscode-languageserver';

import * as vortex from 'vortexlang';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = Boolean(
    capabilities.workspace && !!capabilities.workspace.configuration
  );

  hasWorkspaceFolderCapability = Boolean(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  /*
  hasDiagnosticRelatedInformationCapability = Boolean(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );
  */

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: true
      }
    }
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
// const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
// let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((/*change*/) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    /*
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
    */
  }

  // Revalidate all open text documents
  validateDocuments();
});

/*
function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample'
    });
    documentSettings.set(resource, result);
  }
  return result;
}
*/

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((/*change*/) => {
  validateDocuments();
});

async function validateDocuments(): Promise<void> {
  const docs = documents.all();

  if (docs.length === 0) {
    return Promise.resolve();
  }

  const firstDoc = docs[0];

  const baseMatch = firstDoc.uri.match(/^[^\/]*\/\/[^/]*/);

  if (baseMatch === null) {
    throw new Error('Shouldn\'t be possible');
  }

  const base = baseMatch[0];

  const paths = docs.map(doc => doc.uri.replace(base, '@'));

  function readFile(f: string): string | Error {
    const uri = f.replace('@', base);
    const doc = documents.get(uri);

    if (!doc) {
      return new Error('Document not open: ' + uri);
    }

    return doc.getText();
  }

  const notes = (vortex
    .Note
    .flatten(
      vortex.Compiler.compile(paths, readFile, { stepLimit: 1000000 })[0]
    )
  );

  const diagnostics = new Map<string, Diagnostic[]>();

  for (const uri of docs.map(doc => doc.uri)) {
    diagnostics.set(uri, []);
  }

  for (const note of notes) {
    if (!note.pos[1]) {
      continue;
    }

    const uri = note.pos[0].replace('@', base);
    const el = diagnostics.get(uri) || [];
    diagnostics.set(uri, el);

    el.push({
      range: ({
        start: {
          line: note.pos[1][0][0] - 1,
          character: note.pos[1][0][1] - 1,
        },
        end: {
          line: note.pos[1][0][0] - 1,
          character: note.pos[1][0][1] - 1,
        }
      }),
      message: note.message,
      severity: (() => {
        switch (note.level) {
          case 'error': return DiagnosticSeverity.Error;
          case 'warn': return DiagnosticSeverity.Warning;
          case 'info': return DiagnosticSeverity.Information;
        }
      })(),
      source: 'vortex',
    });
  }

  // Send the computed diagnostics to VSCode.
  for (const uri of diagnostics.keys()) {
    connection.sendDiagnostics({
      uri,
      diagnostics: diagnostics.get(uri) || [],
    });
  }
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2
      }
    ];
  }
);

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      (item.detail = 'TypeScript details'),
        (item.documentation = 'TypeScript documentation');
    } else if (item.data === 2) {
      (item.detail = 'JavaScript details'),
        (item.documentation = 'JavaScript documentation');
    }
    return item;
  }
);

/*
connection.onDidOpenTextDocument((params) => {
  // A text document got opened in VSCode.
  // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
  // params.text the initial full content of the document.
  connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
  // The content of a text document did change in VSCode.
  // params.uri uniquely identifies the document.
  // params.contentChanges describe the content changes to the document.
  connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
  // A text document got closed in VSCode.
  // params.uri uniquely identifies the document.
  connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
