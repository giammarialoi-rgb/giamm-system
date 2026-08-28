import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8');

const oldFnStart = `function compareTargetVsActual({
  targetRir,
  actualRir,
  targetRpe,
  actualRpe,
  targetLoad,
  actualLoad,
  targetReps,
  actualReps
}) {`;

const newFn = `function compareTargetVsActual(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
  let params;
  if (arg1 !== null && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    params = arg1;
  } else {
    params = {
      targetRir: arg1,
      actualRir: arg2,
      targetRpe: arg3,
      actualRpe: arg4,
      targetLoad: arg5,
      actualLoad: arg6,
      targetReps: arg7,
      actualReps: arg8
    };
  }
  const {
    targetRir,
    actualRir,
    targetRpe,
    actualRpe,
    targetLoad,
    actualLoad,
    targetReps,
    actualReps
  } = params;`;

if (html.includes(oldFnStart)) {
  html = html.replace(oldFnStart, newFn);
  // Also add 'status' field to return value
  html = html.replace(
    'let intensityStatus = "on_target";',
    'let intensityStatus = "on_target";\n  let status = "exact";'
  );
  html = html.replace(
    'intensityStatus = "more_intense";',
    'intensityStatus = "more_intense";\n      status = "overreached";'
  );
  html = html.replace(
    'intensityStatus = "less_intense";',
    'intensityStatus = "less_intense";\n      status = "underreached";'
  );
  html = html.replace(
    'return {\n    target: {',
    'return {\n    status,\n    intensityStatus,\n    target: {'
  );
  console.log('✓ Updated compareTargetVsActual to support both object and positional invocations.');
} else {
  console.log('oldFnStart not found exactly, check regex.');
}

fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
