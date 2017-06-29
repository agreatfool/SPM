const gulp = require('gulp');
const ts = require('gulp-typescript');
const merge = require('merge2');

const tsProject = ts.createProject('tsconfig.json', {
  declaration: false
});

gulp.task('typescript', function () {
  let tsResult = gulp.src('src/**/*.ts').pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest('build')),
    tsResult.js.pipe(gulp.dest('build'))
  ]);
});

gulp.task('watch', ['typescript'], function () {
  gulp.watch('src/**/*.ts', ['typescript']);
});