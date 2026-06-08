const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');

let findStr = `                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )}

  {activeTab === "execution" && (`;

let replaceStr = `                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "execution" && (`;

code = code.replace(findStr, replaceStr);

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Fixed syntax tags!');
