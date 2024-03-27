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
        sh 'sleep 10'
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
            sh 'sleep 30'
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
          }
        }

      }
    }

    stage('Deliver') {
      agent {
        node {
          label 'windows'
        }

      }
      steps {
        sh 'sleep 20'
      }
    }

  }
}