import { Compiler, Stats } from 'webpack';

export class CompilationLogger {
  private startTime: number = 0;
  private isFirstCompile: boolean = true;

  apply(compiler: Compiler) {
    console.log('🔧 CompilationLogger: Plugin applied to webpack compiler');
    
    // Hook into compilation start
    compiler.hooks.compile.tap('CompilationLogger', () => {
      this.startTime = Date.now();
      console.log('\n🔨 COMPILATION STARTED');
      console.log('─'.repeat(40));
      console.log(`🕐 Time: ${new Date().toLocaleString()}`);
      console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log('─'.repeat(40));
    });

    // Hook into compilation complete
    compiler.hooks.done.tap('CompilationLogger', (stats: Stats) => {
      const endTime = Date.now();
      const duration = endTime - this.startTime;
      
      const hasErrors = stats.hasErrors();
      const hasWarnings = stats.hasWarnings();
      
      console.log('─'.repeat(40));
      if (hasErrors) {
        console.error('❌ COMPILATION FAILED');
        console.error('📋 Webpack: Errors:', stats.toJson().errors);
      } else if (hasWarnings) {
        console.warn('⚠️ COMPILATION COMPLETED WITH WARNINGS');
        console.warn('📋 Webpack: Warnings:', stats.toJson().warnings);
      } else {
        console.log('✅ COMPILATION COMPLETED SUCCESSFULLY');
      }
      
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`🕐 Time: ${new Date().toLocaleString()}`);
      console.log('─'.repeat(40) + '\n');

      // Log compilation details
      const statsJson = stats.toJson();
      console.log(`📦 Webpack: Built ${statsJson.chunks?.length || 0} chunks`);
      console.log(`📄 Webpack: Generated ${statsJson.assets?.length || 0} assets`);
      
      if (this.isFirstCompile) {
        console.log('🎉 Webpack: First compilation completed - app is ready!');
        this.isFirstCompile = false;
      } else {
        console.log('🔄 Webpack: Hot reload compilation completed');
      }

      // Log build information
      if (process.env.BUILD_ID) {
        console.log(`🆔 Webpack: Build ID: ${process.env.BUILD_ID}`);
      }
      if (process.env.BUILD_TIME) {
        console.log(`🕐 Webpack: Build Time: ${process.env.BUILD_TIME}`);
      }
    });

    // Hook into watch mode
    compiler.hooks.watchRun.tap('CompilationLogger', () => {
      console.log('👀 Webpack: Watching for file changes...');
    });

    // Hook into invalid files
    compiler.hooks.invalid.tap('CompilationLogger', (fileName) => {
      console.log(`🔄 Webpack: File changed: ${fileName}`);
    });
  }
}
