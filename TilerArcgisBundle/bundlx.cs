using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TilerArcgisBundle
{
    /// <summary>
    /// 切片参数
    /// </summary>
    public  class bundlx
    {
        /// <summary>
        /// bundleFile路径
        /// </summary>
        public string bundleFileName { get; set; }
        /// <summary>
        /// bundlx路径
        /// </summary>
        public string bundlxFileName { get; set; }
        /// <summary>
        /// 索引位置
        /// </summary>
        public int index { get; set; }
        /// <summary>
        /// 存储类型
        /// </summary>
        public string storageFormat { get; set; }
    }
}
