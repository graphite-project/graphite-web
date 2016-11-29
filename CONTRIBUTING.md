First of all, Welcome, and Thank You!

Graphite has been a community project for years, and it only gets better by the efforts of people who volunteer.  We sincerely appreciate that you care enough to see a problem and take the time to make this project better.  Whether it's in the form of a bug report, code fix, or documentation improvement, we - the Graphite team - appreciate your help.

This is a collection of practices that will make it easier for us to accept your contributions.


### Issues

While not mandatory, opening an Issue against the appropriate repo is seldom a bad thing.  However, we would love if you would take a moment to search through the existing issues first.  It's entirely possible that the issue has already been reported, or even resolved.

When opening a new issue, please write a descriptive report.  Terse but complete is best.  You should describe:

* What you attempted
* Expected Result
* Witnessed Result
* System Details
  * OS / Version
  * Python Version
  * Django Version (a frequent cause of issues)
  * Graphite Component Versions (or commit hash if running directly from the repo)
    * If the graphite components were installed via pip, `pip list` will show the versions.
    * Graphite-Web has a `/version/` endpoint that returns the version.  For example `curl http://mygraphite/version/`


### Tests

We are always looking to improve our test coverage.  New tests will be appreciated and quickly reviewed for inclusion.


### Code

If you see a mistake, have a feature, or a performance gain, we'd love to see it.  It's _strongly_ encouraged for contributions that aren't already covered by tests to come with them.  We're not trying to foist work on to you, but it makes it much easier for us to accept your contributions.

To set up your development environment, see the instructions in requirements.txt

### Documentation

Graphite has historically not had great docs.  It still doesn't.  The good news is that docs are easy to contribute.

Even if you don't know the intricacies of ReStructured Text (ReST), bare unformatted paragraphs are better than nothing!

English not your primary language?  We'll work with you.
