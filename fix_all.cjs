const fs = require('fs');
let lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');

// 974
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isBasicSubmitted: true, updatedAt: new Date() as any , true);')) {
    lines[i] = '                      handleUpdate({ isBasicSubmitted: true, updatedAt: new Date() as any }, true);';
    lines[i+1] = ''; // remove extra '}'
  }
}

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any , false);')) {
    lines[i] = '                      handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, false);';
    lines[i+1] = ''; // remove extra '}'
  }
}

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('timestamp: new Date()')) {
    if (lines[i+1] && lines[i+1].includes(';')) {
      lines[i] = '                          timestamp: new Date()';
      lines[i+1] = '                        };';
    }
  }
}

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isFinancialsSubmitted: true, updatedAt: new Date() as any , false);')) {
    lines[i] = '                      handleUpdate({ isFinancialsSubmitted: true, updatedAt: new Date() as any }, false);';
    lines[i+1] = ''; // remove extra '}'
  }
}

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isAccountsSubmitted: true, updatedAt: new Date() as any , false);')) {
    lines[i] = '                      handleUpdate({ isAccountsSubmitted: true, updatedAt: new Date() as any }, false);';
    lines[i+1] = ''; // remove extra '}'
  }
}

// 2875
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isExecutionSubmitted: true, updatedAt: new Date() as any , false);')) {
    lines[i] = '                    handleUpdate({ isExecutionSubmitted: true, updatedAt: new Date() as any }, false);';
    lines[i+1] = '                  /* } else { */';
    lines[i+2] = '                  /*  handleUpdate({ updatedAt: new Date() as any }, false); */';
    lines[i+3] = '                  /* } */';
  }
}

fs.writeFileSync('src/components/LeadDetail.tsx', lines.join('\n'));
