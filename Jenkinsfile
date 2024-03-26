pipeline {
  agent {
    node {
      label 'windows'
    }

  }
  stages {
    stage('Build') {
      agent {
        node {
          label 'windows'
        }

      }
      steps {
        build 'Build core'
        stash(name: 'build', allowEmpty: true, includes: '**/target/*', useDefaultExcludes: true)
      }
    }

    stage('Test') {
      parallel {
        stage('Test EST') {
          agent {
            node {
              label 'windows'
            }

          }
          environment {
            profile = 'est'
          }
          steps {
            unstash 'build'
            sh 'sleep 30'
            junit(allowEmptyResults: true, keepLongStdio: true, keepProperties: true, skipOldReports: true, testResults: 'estResults')
          }
        }

        stage('Test CM') {
          agent {
            node {
              label 'windows'
            }

          }
          environment {
            profile = 'cm'
          }
          steps {
            sh 'sleep 45'
            unstash 'build'
          }
        }

      }
    }

    stage('Deliver') {
      agent {
        node {
          label 'linux'
        }

      }
      steps {
        sh 'sleep 20'
        archiveArtifacts '/target/*.zip'
      }
    }

  }
}